from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import State, District, Constituency, Election
from .serializers import StateSerializer, DistrictSerializer, ConstituencySerializer, ElectionSerializer
from apps.authentication.permissions import IsCentralAdministrator
from .blockchain import verify_election_creation, verify_election_status_action
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, timezone as datetime_timezone
from django.conf import settings
from web3 import Web3
from apps.receipts.blockchain import get_web3, load_contract_config
from apps.parties_candidates.models import Candidate
from apps.receipts.models import VoteReceipt

class StateListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None
    queryset = State.objects.all().order_by('name')
    serializer_class = StateSerializer

class DistrictListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None
    queryset = District.objects.all().order_by('name')
    serializer_class = DistrictSerializer

class ConstituencyListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = ConstituencySerializer

    def get_queryset(self):
        queryset = Constituency.objects.select_related('district').all().order_by('name')
        district_id = self.request.query_params.get('district_id')
        state_id = self.request.query_params.get('state_id')
        if district_id:
            queryset = queryset.filter(district_id=district_id)
        if state_id:
            queryset = queryset.filter(district__state_id=state_id)
        return queryset

class ElectionListCreateView(generics.ListCreateAPIView):
    serializer_class = ElectionSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsCentralAdministrator()]

    def get_queryset(self):
        queryset = Election.objects.prefetch_related('constituencies').all()
        year = self.request.query_params.get('year')
        status_param = self.request.query_params.get('status')
        if year:
            queryset = queryset.filter(year=year)
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    def perform_create(self, serializer):
        creation_tx_hash = serializer.validated_data.pop('creation_tx_hash', None)
        if not creation_tx_hash:
            raise ValidationError({'creation_tx_hash': 'A confirmed ElectionManager creation transaction is required.'})
        election_state = serializer.validated_data['state']
        try:
            transaction_hash = verify_election_creation(creation_tx_hash, {
                **serializer.validated_data,
                'state_name': election_state.name,
            })
        except ConnectionError as error:
            raise ValidationError({'blockchain': str(error)}, code='service_unavailable')
        except Exception as error:
            raise ValidationError({'blockchain': f'Could not verify election creation on chain: {error}'})
        start_time = serializer.validated_data['start_time']
        end_time = serializer.validated_data['end_time']
        chain_status = Election.Status.ACTIVE if start_time <= timezone.now() <= end_time else Election.Status.UPCOMING
        serializer.save(on_chain_tx_hash=transaction_hash, status=chain_status)

class ElectionDetailView(generics.RetrieveAPIView):
    queryset = Election.objects.all()
    serializer_class = ElectionSerializer

    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsCentralAdministrator()]

    def delete(self, request, *args, **kwargs):
        election = self.get_object()
        w3 = get_web3()
        if not w3.is_connected():
            return Response({'error': 'Cannot check the active chain; election was not removed.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        manager_config = load_contract_config()['ElectionManager']
        manager = w3.eth.contract(
            address=Web3.to_checksum_address(manager_config['address']),
            abi=manager_config['abi'],
        )
        on_chain_election = manager.functions.elections(election.pk).call()
        if on_chain_election[7]:
            return Response(
                {'error': 'This election exists on the active chain. Cancel it on-chain instead of removing it.'},
                status=status.HTTP_409_CONFLICT,
            )
        if election.candidates.exists() or election.receipts.exists():
            return Response(
                {'error': 'This election has candidate or vote history and cannot be removed. Preserve the record and reconcile it with the active chain.'},
                status=status.HTTP_409_CONFLICT,
            )
        election.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ElectionChainSyncView(APIView):
    permission_classes = [IsCentralAdministrator]

    def post(self, request, pk):
        try:
            election = Election.objects.get(pk=pk)
        except Election.DoesNotExist:
            return Response({'error': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)

        w3 = get_web3()
        if not w3.is_connected():
            return Response({'error': 'Configured blockchain RPC is unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if int(w3.eth.chain_id) != int(settings.CHAIN_ID):
            return Response({'error': 'Connected chain ID does not match configured deployment.'}, status=status.HTTP_409_CONFLICT)

        config = load_contract_config()['ElectionManager']
        manager = w3.eth.contract(address=Web3.to_checksum_address(config['address']), abi=config['abi'])
        chain_election = manager.functions.elections(election.pk).call()
        if not chain_election[7]:
            return Response({'error': 'This election is not present on the active chain.'}, status=status.HTTP_409_CONFLICT)

        try:
            creation_events = manager.events.ElectionCreated().get_logs(from_block=0, to_block='latest')
        except Exception as error:
            return Response({'error': f'Could not read ElectionCreated events: {error}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        matching_event = next((event for event in creation_events if int(event['args']['electionId']) == election.pk), None)
        if matching_event is None:
            return Response({'error': 'The active chain has no ElectionCreated event for this election.'}, status=status.HTTP_409_CONFLICT)

        state_name = chain_election[3]
        try:
            state = State.objects.get(name=state_name)
        except State.DoesNotExist:
            return Response({'error': f'Chain state "{state_name}" is not in the backend catalog.'}, status=status.HTTP_409_CONFLICT)

        status_map = {
            0: Election.Status.UPCOMING,
            1: Election.Status.ACTIVE,
            2: Election.Status.ENDED,
            3: Election.Status.RESULTS_PUBLISHED,
            4: Election.Status.ARCHIVED,
            5: Election.Status.CANCELLED,
        }
        election.name = chain_election[1]
        election.year = int(chain_election[2])
        election.state = state
        election.start_time = datetime.fromtimestamp(int(chain_election[4]), tz=datetime_timezone.utc)
        election.end_time = datetime.fromtimestamp(int(chain_election[5]), tz=datetime_timezone.utc)
        election.status = status_map[int(chain_election[6])]
        election.on_chain_tx_hash = matching_event['transactionHash'].hex()
        election.save(update_fields=['name', 'year', 'state', 'start_time', 'end_time', 'status', 'on_chain_tx_hash'])
        return Response({'message': 'Election schedule and status synchronized from the active chain.', 'election': ElectionSerializer(election).data})

class ElectionStatusControlView(APIView):
    permission_classes = [IsCentralAdministrator]

    def post(self, request, pk):
        try:
            election = Election.objects.get(pk=pk)
        except Election.DoesNotExist:
            return Response({'error': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        tx_hash = request.data.get('tx_hash')

        if action == 'START':
            if election.status != Election.Status.UPCOMING:
                return Response({'error': 'Only upcoming elections can be started.'}, status=status.HTTP_400_BAD_REQUEST)
            election.status = Election.Status.ACTIVE
        elif action == 'STOP':
            if election.status != Election.Status.ACTIVE:
                return Response({'error': 'Only active elections can be stopped.'}, status=status.HTTP_400_BAD_REQUEST)
            election.status = Election.Status.ENDED
        elif action == 'PUBLISH_RESULTS':
            if election.status not in (Election.Status.ENDED, Election.Status.ACTIVE):
                return Response({'error': 'Results can only be published after the election ends.'}, status=status.HTTP_400_BAD_REQUEST)
            election.status = Election.Status.RESULTS_PUBLISHED
        elif action == 'ARCHIVE':
            if election.status != Election.Status.RESULTS_PUBLISHED:
                return Response({'error': 'Election must be in RESULTS_PUBLISHED status before archiving.'}, status=status.HTTP_400_BAD_REQUEST)
            election.status = Election.Status.ARCHIVED
        elif action == 'CANCEL':
            if election.status not in (Election.Status.UPCOMING, Election.Status.ACTIVE):
                return Response({'error': 'Only upcoming or active elections can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
            election.status = Election.Status.CANCELLED
        else:
            return Response({'error': f'Invalid action: {action}'}, status=status.HTTP_400_BAD_REQUEST)

        if not tx_hash:
            return Response({'error': 'A confirmed on-chain transaction hash is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            verified_hash = verify_election_status_action(tx_hash, action, election.pk)
        except ConnectionError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as error:
            return Response({'error': f'Could not reconcile election action with the blockchain: {error}'}, status=status.HTTP_409_CONFLICT)

        election.on_chain_tx_hash = verified_hash

        election.save()
        return Response({
            'message': f'Election status updated to {election.status}.',
            'election': ElectionSerializer(election).data
        })
