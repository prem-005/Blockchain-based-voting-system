import logging
from datetime import timedelta
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect, csrf_exempt
from django.utils.decorators import method_decorator
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import login, logout, authenticate
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from apps.elections.models import District
from .permissions import IsCentralAdministrator

from .models import User, OTPToken
from .email_service import send_email_async
from .serializers import AdminAccountCreateSerializer, AdminAccountSerializer, UserSerializer, SendOTPSerializer, VerifyOTPSerializer, LoginSerializer

logger = logging.getLogger(__name__)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfCookieView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'csrf_cookie_set': True})

@method_decorator(csrf_exempt, name='dispatch')
class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].lower()
        purpose = serializer.validated_data['purpose']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'No account registered with this email address.'}, status=status.HTTP_404_NOT_FOUND)

        # Rate limiting: 60-second cooldown check
        latest_token = OTPToken.objects.filter(user=user, purpose=purpose).first()
        if latest_token and (timezone.now() - latest_token.created_at) < timedelta(seconds=60):
            wait_seconds = 60 - int((timezone.now() - latest_token.created_at).total_seconds())
            return Response(
                {'error': f'Please wait {wait_seconds} seconds before requesting a new OTP.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        token = OTPToken.generate_otp(user=user, purpose=purpose, validity_minutes=5)

        subject = f"LightVote Verification Code: {token.otp_code}"
        message = (
            f"Greetings from LightVote Election Commission,\n\n"
            f"Your one-time verification code is: {token.otp_code}\n\n"
            f"This code is strictly valid for 5 minutes and single-use only. "
            f"Never share this code with anyone.\n\n"
            f"If you did not request this verification, please ignore this email."
        )

        send_email_async(email, subject, message)

        return Response({
            'message': 'Verification OTP generated successfully.',
            'email': email,
            'cooldown_seconds': 60
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].lower()
        otp_code = serializer.validated_data['otp_code']
        purpose = serializer.validated_data['purpose']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        from django.db import transaction
        with transaction.atomic():
            latest_token = OTPToken.objects.select_for_update().filter(
                user=user, purpose=purpose, is_used=False
            ).first()
            if not latest_token:
                return Response({'error': 'No active OTP request found for this account. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)

            success, msg = latest_token.verify(otp_code)
            if not success:
                return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

            user.is_verified = True
            user.save(update_fields=['is_verified'])

        # Establish session
        login(request, user)

        # Return voter details if exists
        voter_profile = None
        if hasattr(user, 'voter_profile'):
            vp = user.voter_profile
            voter_profile = {
                'voter_id': vp.voter_id_number,
                'status': vp.status,
                'district_id': vp.district_id,
                'district_name': vp.district.name if vp.district else None,
                'constituency_id': vp.constituency_id,
                'constituency_name': vp.constituency.name if vp.constituency else None,
                'wallet_address': vp.wallet_address
            }

        return Response({
            'message': 'Authentication successful.',
            'user': UserSerializer(user).data,
            'voter_profile': voter_profile
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].lower()
        password = serializer.validated_data.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        # If user has a password set (e.g. admins)
        if password and user.has_usable_password():
            authenticated_user = authenticate(request, username=email, password=password)
            if authenticated_user:
                login(request, authenticated_user)
                return Response({
                    'message': 'Login successful.',
                    'user': UserSerializer(authenticated_user).data
                })
            else:
                return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Voter passwordless OTP login pathway
        token = OTPToken.generate_otp(user=user, purpose='LOGIN', validity_minutes=5)
        subject = f"LightVote Login OTP: {token.otp_code}"
        message = f"Your LightVote login verification code is: {token.otp_code}\nValid for 5 minutes."
        send_email_async(email, subject, message)

        return Response({
            'requires_otp': True,
            'email': email,
            'message': 'OTP dispatched to email. Enter OTP to complete login.'
        })

@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)

class MeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'authenticated': False}, status=status.HTTP_200_OK)

        user = request.user
        voter_profile = None
        if hasattr(user, 'voter_profile'):
            vp = user.voter_profile
            voter_profile = {
                'voter_id': vp.voter_id_number,
                'status': vp.status,
                'district_id': vp.district_id,
                'district_name': vp.district.name if vp.district else None,
                'constituency_id': vp.constituency_id,
                'constituency_name': vp.constituency.name if vp.constituency else None,
                'wallet_address': vp.wallet_address
            }

        return Response({
            'authenticated': True,
            'user': UserSerializer(user).data,
            'voter_profile': voter_profile
        })


class TestEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        to_email = request.query_params.get('email', '').strip()
        if not to_email:
            return Response(
                {'error': 'Please provide an email address in the query parameters (e.g. ?email=voter@gmail.com)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .email_service import test_email_service
        diagnosis = test_email_service(to_email)
        return Response(diagnosis, status=status.HTTP_200_OK)


class AdminAccountListCreateView(APIView):
    permission_classes = [IsCentralAdministrator]

    def get(self, request):
        administrators = User.objects.filter(
            role__in=[User.Role.CENTRAL_ADMIN, User.Role.DISTRICT_ADMIN]
        ).order_by('role', 'email')
        return Response(AdminAccountSerializer(administrators, many=True).data)

    def post(self, request):
        serializer = AdminAccountCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admin = serializer.save()
        return Response(AdminAccountSerializer(admin).data, status=status.HTTP_201_CREATED)


class AdminAccountDetailView(APIView):
    permission_classes = [IsCentralAdministrator]

    def patch(self, request, pk):
        admin = get_object_or_404(
            User.objects.filter(role__in=[User.Role.CENTRAL_ADMIN, User.Role.DISTRICT_ADMIN]),
            pk=pk,
        )
        if admin.is_superuser:
            raise PermissionDenied('The bootstrap superuser cannot be changed through this endpoint.')
        if admin.pk == request.user.pk and request.data.get('is_active') is False:
            raise ValidationError({'is_active': 'You cannot deactivate your own account.'})

        allowed_fields = {'is_active', 'assigned_district_id'}
        if set(request.data.keys()) - allowed_fields:
            raise ValidationError('Only is_active and assigned_district_id can be changed.')

        if 'is_active' in request.data:
            if not isinstance(request.data['is_active'], bool):
                raise ValidationError({'is_active': 'Expected true or false.'})
            admin.is_active = request.data['is_active']

        if 'assigned_district_id' in request.data:
            district_id = request.data['assigned_district_id']
            if admin.role != User.Role.DISTRICT_ADMIN:
                raise ValidationError({'assigned_district_id': 'Only district administrators can be assigned to a district.'})
            if district_id is None or not District.objects.filter(pk=district_id).exists():
                raise ValidationError({'assigned_district_id': 'Select an existing district.'})
            admin.assigned_district_id = district_id

        admin.save(update_fields=['is_active', 'assigned_district_id'])
        return Response(AdminAccountSerializer(admin).data)
