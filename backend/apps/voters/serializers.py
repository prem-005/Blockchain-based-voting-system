from rest_framework import serializers
from django.db import transaction
from .models import Voter, VoterAuditLog
from apps.authentication.models import User

class VoterRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Voter
        fields = [
            'id', 'voter_id_number', 'full_name', 'date_of_birth',
            'email', 'password', 'mobile_number', 'state', 'district',
            'constituency', 'address', 'pin_code', 'wallet_address',
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def validate_email(self, value):
        val = value.lower().strip()
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return val

    def validate_mobile_number(self, value):
        val = value.strip().replace(" ", "").replace("-", "")
        if Voter.objects.filter(mobile_number=val).exists():
            raise serializers.ValidationError("An account with this mobile number already exists.")
        return val

    def validate_pin_code(self, value):
        val = value.strip() if value else ''
        if not val:
            return '600001'
        if not (val.isdigit() and len(val) == 6):
            raise serializers.ValidationError("PIN code must be exactly 6 digits.")
        return val

    def validate(self, attrs):
        district = attrs.get('district')
        constituency = attrs.get('constituency')
        state = attrs.get('state')
        if constituency and district and constituency.district_id != district.pk:
            raise serializers.ValidationError({'constituency': 'Selected constituency does not belong to the selected district.'})
        if district and state and district.state_id != state.pk:
            raise serializers.ValidationError({'district': 'Selected district does not belong to the selected state.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data.pop('email')
        password = validated_data.pop('password', None)

        user = User.objects.create_user(
            email=email,
            password=password,
            role=User.Role.VOTER,
            first_name=validated_data.get('full_name', '').split(' ')[0]
        )

        voter = Voter.objects.create(user=user, **validated_data)

        VoterAuditLog.objects.create(
            voter=voter,
            action="APPLICATION_SUBMITTED",
            performed_by=user,
            notes="Voter submitted online registration application."
        )

        return voter

class VoterDetailSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)
    state_name = serializers.CharField(source='state.name', read_only=True)
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True)

    class Meta:
        model = Voter
        fields = [
            'id', 'voter_id_number', 'full_name', 'date_of_birth',
            'email', 'mobile_number', 'state', 'state_name',
            'district', 'district_name', 'constituency', 'constituency_name',
            'address', 'pin_code', 'wallet_address', 'status',
            'reviewed_by_email', 'reviewed_at', 'rejection_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

class VoterReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['APPROVE', 'REJECT'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

class VoterAuditLogSerializer(serializers.ModelSerializer):
    performed_by_email = serializers.EmailField(source='performed_by.email', read_only=True)

    class Meta:
        model = VoterAuditLog
        fields = ['id', 'action', 'performed_by_email', 'timestamp', 'notes']

class BallotCredentialSerializer(serializers.Serializer):
    election_id = serializers.IntegerField(min_value=1)
    candidate_id = serializers.IntegerField(min_value=1)
    wallet_address = serializers.CharField(min_length=42, max_length=42)
