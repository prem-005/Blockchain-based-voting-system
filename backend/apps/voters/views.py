from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from web3 import Web3
from django.db.models import Q
from .models import Voter, VoterAuditLog
from .serializers import (
    VoterRegistrationSerializer,
    VoterDetailSerializer,
    VoterReviewSerializer,
    VoterAuditLogSerializer,
    BallotCredentialSerializer,
)
from apps.authentication.models import User, OTPToken
from apps.authentication.email_service import send_email_async
from apps.authentication.permissions import IsElectionAdministrator
from apps.elections.models import Constituency, Election
from apps.parties_candidates.models import Candidate
from apps.receipts.blockchain import get_web3, load_contract_config
from apps.receipts.models import VoteReceipt
from .eligibility import derive_nullifier, build_merkle_tree

logger = logging.getLogger(__name__)

@method_decorator(csrf_protect, name='dispatch')
class VoterRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = VoterRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            voter = serializer.save()
        except IntegrityError:
            return Response(
                {'error': 'Registration conflicts with an existing email, voter ID, or mobile number.'},
                status=status.HTTP_409_CONFLICT,
            )

        # Generate initial OTP for email verification
        token = OTPToken.generate_otp(user=voter.user, purpose='REGISTRATION', validity_minutes=10)

        subject = 'LightVote email verification code'
        message = f'Your LightVote verification code is {token.otp_code}. It expires in 10 minutes.'
        send_email_async(voter.user.email, subject, message)

        response_data = {
            'message': 'Registration submitted successfully. Please verify your email with the OTP.',
            'voter_id': voter.voter_id_number,
            'email': voter.user.email,
            'status': voter.status,
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

class MyVoterProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'voter_profile'):
            return Response({'error': 'No voter profile associated with this account.'}, status=status.HTTP_404_NOT_FOUND)

        voter = request.user.voter_profile
        serializer = VoterDetailSerializer(voter)
        return Response(serializer.data)

    def patch(self, request):
        if not hasattr(request.user, 'voter_profile'):
            return Response({'error': 'No voter profile found.'}, status=status.HTTP_404_NOT_FOUND)

        voter = request.user.voter_profile
        wallet_address = request.data.get('wallet_address')
        if wallet_address:
            # Normalize address
            wallet_address = wallet_address.strip()
            if not wallet_address.startswith('0x') or len(wallet_address) != 42:
                return Response({'error': 'Invalid Ethereum wallet address format.'}, status=status.HTTP_400_BAD_REQUEST)
            voter.wallet_address = wallet_address
            voter.save(update_fields=['wallet_address'])

        return Response(VoterDetailSerializer(voter).data)

class VoterAdminListView(generics.ListAPIView):
    permission_classes = [IsElectionAdministrator]
    serializer_class = VoterDetailSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Voter.objects.select_related('user', 'district', 'constituency', 'state', 'reviewed_by').all()

        # Scoping rule: District Admin can ONLY see voters in their assigned district
        if user.role == User.Role.DISTRICT_ADMIN:
            if not user.assigned_district_id:
                return Voter.objects.none()
            queryset = queryset.filter(district_id=user.assigned_district_id)
        elif user.role != User.Role.CENTRAL_ADMIN and not user.is_superuser:
            return Voter.objects.none()

        status_param = self.request.query_params.get('status')
        constituency_param = self.request.query_params.get('constituency_id')
        search_query = self.request.query_params.get('search')

        if status_param:
            queryset = queryset.filter(status=status_param)
        if constituency_param:
            queryset = queryset.filter(constituency_id=constituency_param)
        if search_query:
            queryset = queryset.filter(
                Q(voter_id_number__icontains=search_query) |
                Q(full_name__icontains=search_query) |
                Q(mobile_number__icontains=search_query) |
                Q(user__email__icontains=search_query)
            )

        return queryset

class VoterReviewView(APIView):
    permission_classes = [IsElectionAdministrator]

    def post(self, request, pk):
        user = request.user
        if user.role not in [User.Role.CENTRAL_ADMIN, User.Role.DISTRICT_ADMIN] and not user.is_superuser:
            return Response({'error': 'Unauthorized: Administrator privileges required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            voter = Voter.objects.select_related('district').get(pk=pk)
        except Voter.DoesNotExist:
            return Response({'error': 'Voter application not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Scoping enforcement: District admin cannot review outside assigned district
        if user.role == User.Role.DISTRICT_ADMIN:
            if user.assigned_district_id != voter.district_id:
                return Response({'error': 'Unauthorized: You can only review voters in your assigned district.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = VoterReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data['action']
        rejection_reason = serializer.validated_data.get('rejection_reason', '')

        if action == 'APPROVE':
            voter.status = Voter.Status.APPROVED
            voter.rejection_reason = ''
            action_name = "APPLICATION_APPROVED"
            notes = "Eligibility verified and application approved by administrator."
        else:
            voter.status = Voter.Status.REJECTED
            voter.rejection_reason = rejection_reason or 'Eligibility documentation incomplete or inconsistent.'
            action_name = "APPLICATION_REJECTED"
            notes = f"Rejected: {voter.rejection_reason}"

        voter.reviewed_by = user
        voter.reviewed_at = timezone.now()
        voter.save()

        VoterAuditLog.objects.create(
            voter=voter,
            action=action_name,
            performed_by=user,
            notes=notes
        )

        return Response({
            'message': f"Voter application {voter.status.lower()}.",
            'voter': VoterDetailSerializer(voter).data
        })

    def delete(self, request, pk):
        user = request.user
        if user.role != User.Role.CENTRAL_ADMIN and user.role != User.Role.DISTRICT_ADMIN and not user.is_superuser:
            return Response({'error': 'Unauthorized to remove voters.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            voter = Voter.objects.get(pk=pk)
        except Voter.DoesNotExist:
            return Response({'error': 'Voter record not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == User.Role.DISTRICT_ADMIN:
            if not user.assigned_district_id or voter.district_id != user.assigned_district_id:
                return Response({'error': 'Unauthorized: Voter belongs to another district.'}, status=status.HTTP_403_FORBIDDEN)

        voter_user = voter.user
        voter_id_number = voter.voter_id_number
        voter.delete()
        if voter_user:
            voter_user.delete()

        return Response({'message': f'Voter {voter_id_number} and associated account deleted successfully.'}, status=status.HTTP_200_OK)

class VoterAuditLogsView(generics.ListAPIView):
    permission_classes = [IsElectionAdministrator]
    serializer_class = VoterAuditLogSerializer

    def get_queryset(self):
        voter_id = self.kwargs['pk']
        user = self.request.user
        if user.role == User.Role.DISTRICT_ADMIN:
            return VoterAuditLog.objects.filter(voter_id=voter_id, voter__district_id=user.assigned_district_id)
        elif user.role == User.Role.CENTRAL_ADMIN or user.is_superuser:
            return VoterAuditLog.objects.filter(voter_id=voter_id)
        return VoterAuditLog.objects.none()


class EligibilityRootsView(APIView):
    permission_classes = [IsElectionAdministrator]

    def get(self, request):
        election_id = request.query_params.get('election_id')
        if not election_id:
            return Response({'error': 'election_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return Response({'error': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)

        voters = Voter.objects.filter(
            status=Voter.Status.APPROVED,
            user__is_verified=True,
            constituency__district__state=election.state,
        ).select_related('user')
        if request.user.role == User.Role.DISTRICT_ADMIN:
            if not request.user.assigned_district_id:
                return Response({'error': 'No district is assigned to this administrator.'}, status=status.HTTP_403_FORBIDDEN)
            voters = voters.filter(district_id=request.user.assigned_district_id)

        constituencies = Constituency.objects.filter(district__state=election.state)
        if request.user.role == User.Role.DISTRICT_ADMIN:
            constituencies = constituencies.filter(district_id=request.user.assigned_district_id)

        leaves_by_constituency = {}
        for constituency_id, user_id in voters.values_list('constituency_id', 'user_id'):
            leaves_by_constituency.setdefault(constituency_id, []).append(
                derive_nullifier(user_id, election.pk)
            )

        roots = []
        for constituency_id in constituencies.order_by('id').values_list('id', flat=True):
            leaves = leaves_by_constituency.get(constituency_id, [])
            if leaves:
                root, _ = build_merkle_tree(leaves)
            else:
                # Replace any stale root with a nonzero root containing no
                # voter commitment, invalidating proofs for removed voters.
                root = Web3.keccak(text=f'lightvote-empty-eligibility:v1:{election.pk}:{constituency_id}')
            roots.append({
                'constituency_id': constituency_id,
                'merkle_root': Web3.to_hex(root),
                'eligible_voters': len(leaves),
            })
        return Response({'election_id': election.pk, 'roots': roots})


class BallotCredentialView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BallotCredentialSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        voter = getattr(request.user, 'voter_profile', None)
        if not voter or voter.status != Voter.Status.APPROVED or not request.user.is_verified:
            return Response({'error': 'An approved, email-verified voter account is required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            wallet = Web3.to_checksum_address(serializer.validated_data['wallet_address'])
        except Exception:
            return Response({'error': 'A valid Ethereum wallet address is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if voter.wallet_address and voter.wallet_address.lower() != wallet.lower():
            return Response({'error': 'Connected wallet does not match the wallet bound to this voter profile.'}, status=status.HTTP_403_FORBIDDEN)
        if not voter.wallet_address:
            voter.wallet_address = wallet
            try:
                voter.save(update_fields=['wallet_address'])
            except Exception:
                return Response({'error': 'This wallet is already linked to another voter account.'}, status=status.HTTP_409_CONFLICT)

        election_id = serializer.validated_data['election_id']
        candidate_id = serializer.validated_data['candidate_id']
        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist:
            return Response({'error': 'Election not found.'}, status=status.HTTP_404_NOT_FOUND)
        candidate = Candidate.objects.filter(
            election=election,
            candidate_id=candidate_id,
            constituency_id=voter.constituency_id,
            is_active=True,
        ).first()
        if not candidate:
            return Response({'error': 'Candidate is not active in your election and constituency.'}, status=status.HTTP_403_FORBIDDEN)
        if election.status != Election.Status.ACTIVE or not election.is_currently_open:
            return Response({'error': 'Election is not open according to the backend schedule.'}, status=status.HTTP_409_CONFLICT)
        if VoteReceipt.objects.filter(election=election, user=request.user).exists():
            return Response({'error': 'A vote has already been recorded for your account in this election.'}, status=status.HTTP_409_CONFLICT)

        nullifier = derive_nullifier(request.user.pk, election.pk)
        leaves = [derive_nullifier(user_id, election.pk) for user_id in Voter.objects.filter(
            status=Voter.Status.APPROVED,
            user__is_verified=True,
            constituency_id=voter.constituency_id,
        ).values_list('user_id', flat=True)]
        root, proofs = build_merkle_tree(leaves)
        proof = proofs.get(nullifier)
        if proof is None:
            return Response({'error': 'Eligible voter commitment could not be found.'}, status=status.HTTP_409_CONFLICT)

        try:
            w3 = get_web3()
            if not w3.is_connected() or int(w3.eth.chain_id) != int(settings.CHAIN_ID):
                return Response({'error': 'Configured blockchain RPC is unavailable or on the wrong chain.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            config = load_contract_config()
            manager = w3.eth.contract(address=Web3.to_checksum_address(config['ElectionManager']['address']), abi=config['ElectionManager']['abi'])
            eligibility = w3.eth.contract(address=Web3.to_checksum_address(config['VoterEligibility']['address']), abi=config['VoterEligibility']['abi'])
            if not manager.functions.isElectionOpen(election_id).call():
                return Response({'error': 'Election is not open on the blockchain.'}, status=status.HTTP_409_CONFLICT)
            chain_root = eligibility.functions.constituencyMerkleRoots(election_id, voter.constituency_id).call()
            if Web3.to_hex(chain_root).lower() != Web3.to_hex(root).lower():
                return Response({'error': 'Eligibility tree is not synchronized to the blockchain. Ask an election administrator to publish the current root.'}, status=status.HTTP_409_CONFLICT)
            if eligibility.functions.hasVotedNullifier(election_id, nullifier).call():
                return Response({'error': 'This voter credential has already been used on-chain.'}, status=status.HTTP_409_CONFLICT)
        except Exception:
            return Response({'error': 'Could not verify current election and eligibility state on the blockchain.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({
            'election_id': election_id,
            'constituency_id': voter.constituency_id,
            'candidate_id': candidate_id,
            'nullifier_hash': Web3.to_hex(nullifier),
            'merkle_proof': [Web3.to_hex(node) for node in proof],
        })
