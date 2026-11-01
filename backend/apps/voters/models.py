from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date
from apps.elections.models import State, District, Constituency

def validate_adult(birth_date):
    if not birth_date:
        raise ValidationError("Date of birth is required.")
    today = date.today()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    if age < 18:
        raise ValidationError(f"Voter must be at least 18 years old to register. Calculated age: {age}.")

class Voter(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='voter_profile')
    voter_id_number = models.CharField(max_length=30, unique=True, help_text="Official Voter ID / EPIC Number")
    full_name = models.CharField(max_length=150)
    date_of_birth = models.DateField(validators=[validate_adult])
    mobile_number = models.CharField(max_length=15, unique=True)
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name='registered_voters')
    district = models.ForeignKey(District, on_delete=models.PROTECT, related_name='registered_voters')
    constituency = models.ForeignKey(Constituency, on_delete=models.PROTECT, related_name='registered_voters')
    address = models.TextField(blank=True, default='')
    pin_code = models.CharField(max_length=6, blank=True, default='600001')
    wallet_address = models.CharField(max_length=42, unique=True, null=True, blank=True, help_text="Ethereum Wallet Address (0x...)")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_voters'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')

    # Anonymous cryptographic blinding commitment for ballot issuance
    nullifier_commitment = models.CharField(max_length=66, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        super().clean()
        if self.constituency and self.district:
            if self.constituency.district_id != self.district_id:
                raise ValidationError({
                    'constituency': f"Constituency '{self.constituency.name}' does not belong to District '{self.district.name}'."
                })

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.voter_id_number}) - {self.status}"

class VoterAuditLog(models.Model):
    voter = models.ForeignKey(Voter, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=50)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.voter.voter_id_number} - {self.action} at {self.timestamp}"
