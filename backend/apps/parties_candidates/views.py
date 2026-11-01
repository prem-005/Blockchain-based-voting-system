from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied, MethodNotAllowed
from django.db.models import Q
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Party, Candidate
from .serializers import PartySerializer, CandidateSerializer
from apps.authentication.models import User
from apps.authentication.permissions import IsElectionAdministrator
from apps.authentication.permissions import IsCentralAdministrator
from apps.elections.models import Election

class PartyListCreateView(generics.ListCreateAPIView):
    queryset = Party.objects.all()
    serializer_class = PartySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsCentralAdministrator()]

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save()

class PartyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Party.objects.all()
    serializer_class = PartySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsCentralAdministrator()]

    def get_queryset(self):
        queryset = Party.objects.all()
        if self.request.method != 'GET' and self.request.user.role != User.Role.CENTRAL_ADMIN and not self.request.user.is_superuser:
            return Party.objects.none()
        return queryset

class CandidateListCreateView(generics.ListCreateAPIView):
    serializer_class = CandidateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsElectionAdministrator()]

    def get_queryset(self):
        queryset = Candidate.objects.select_related('party', 'election', 'district', 'constituency').all()
        user = self.request.user

        # District administrators can inspect candidates only in their assigned district.
        if user.is_authenticated and user.role == User.Role.DISTRICT_ADMIN:
            if not user.assigned_district_id:
                return queryset.none()
            queryset = queryset.filter(district_id=user.assigned_district_id)

        election_id = self.request.query_params.get('election_id')
        constituency_id = self.request.query_params.get('constituency_id')
        district_id = self.request.query_params.get('district_id')
        active_only = self.request.query_params.get('active_only')
        search = self.request.query_params.get('search')

        if election_id:
            queryset = queryset.filter(election_id=election_id)
        if constituency_id:
            queryset = queryset.filter(constituency_id=constituency_id)
        if district_id:
            queryset = queryset.filter(district_id=district_id)
        if active_only and active_only.lower() in ['true', '1']:
            queryset = queryset.filter(is_active=True)
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(party__name__icontains=search) | Q(party__abbreviation__icontains=search))

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        district = serializer.validated_data.get('district')
        election = serializer.validated_data.get('election')
        if election.status in (Election.Status.ENDED, Election.Status.RESULTS_PUBLISHED, Election.Status.ARCHIVED):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'election': 'Candidates cannot be added after voting has ended.'})
        if user.role == User.Role.DISTRICT_ADMIN:
            if user.assigned_district_id != district.pk:
                raise PermissionDenied("District administrators can only register candidates in their assigned district.")

        serializer.save()

class CandidateDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsElectionAdministrator()]

    def get_queryset(self):
        queryset = Candidate.objects.select_related('party', 'election', 'district', 'constituency').all()
        user = self.request.user
        if user.is_authenticated and user.role == User.Role.DISTRICT_ADMIN:
            if not user.assigned_district_id:
                return queryset.none()
            return queryset.filter(district_id=user.assigned_district_id)
        if self.request.method != 'GET' and user.role != User.Role.CENTRAL_ADMIN and not user.is_superuser:
            return Candidate.objects.none()
        return queryset

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed('DELETE', detail='On-chain candidates cannot be deleted. Withdraw the candidate from the ballot instead.')
