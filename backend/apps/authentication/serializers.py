from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.elections.models import District

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'assigned_district_id', 'is_verified']
        read_only_fields = ['id', 'is_verified']

class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=['LOGIN', 'REGISTRATION', 'BALLOT_ACCESS'], default='LOGIN')

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)
    purpose = serializers.ChoiceField(choices=['LOGIN', 'REGISTRATION', 'BALLOT_ACCESS'], default='LOGIN')

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False)


class AdminAccountCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=[User.Role.CENTRAL_ADMIN, User.Role.DISTRICT_ADMIN])
    assigned_district_id = serializers.IntegerField(required=False, allow_null=True)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return normalized

    def validate(self, attrs):
        district_id = attrs.get('assigned_district_id')
        if attrs['role'] == User.Role.DISTRICT_ADMIN:
            if not district_id or not District.objects.filter(pk=district_id).exists():
                raise serializers.ValidationError({'assigned_district_id': 'Select an existing district for a district administrator.'})
        elif district_id is not None:
            raise serializers.ValidationError({'assigned_district_id': 'Central administrators are not assigned to a district.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data, is_verified=False)


class AdminAccountSerializer(serializers.ModelSerializer):
    district_name = serializers.SerializerMethodField()
    is_bootstrap_admin = serializers.BooleanField(source='is_superuser', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'role', 'assigned_district_id', 'district_name', 'is_active', 'is_verified', 'is_bootstrap_admin', 'date_joined']

    def get_district_name(self, obj):
        if not obj.assigned_district_id:
            return None
        return District.objects.filter(pk=obj.assigned_district_id).values_list('name', flat=True).first()
