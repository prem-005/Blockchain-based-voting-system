from django.db import models
from django.db.models import Q
from django.conf import settings
from apps.elections.models import Election, Constituency

class VoteReceipt(models.Model):
    class VerificationStatus(models.TextChoices):
        CONFIRMED = 'CONFIRMED', 'Confirmed on Blockchain'
        PENDING = 'PENDING', 'Pending Mining'
        FAILED = 'FAILED', 'Transaction Failed'

    receipt_ref = models.CharField(max_length=66, unique=True, db_index=True, help_text="Cryptographic anonymous receipt identifier")
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='receipts')
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='receipts')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='my_receipts',
        help_text="Optional link for authenticated voter retrieval"
    )
    tx_hash = models.CharField(max_length=66, unique=True, db_index=True)
    block_number = models.PositiveIntegerField(null=True, blank=True)
    block_hash = models.CharField(max_length=66, blank=True, default='')
    nullifier_hash = models.CharField(max_length=66, db_index=True)
    merkle_proof = models.JSONField(default=list, blank=True)
    gas_used = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.CONFIRMED)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        constraints = [
            models.UniqueConstraint(
                fields=['election', 'nullifier_hash'],
                name='unique_nullifier_per_election',
            ),
            models.UniqueConstraint(
                fields=['election', 'user'],
                condition=Q(user__isnull=False),
                name='unique_user_receipt_per_election',
            ),
        ]

    def __str__(self):
        return f"Receipt {self.receipt_ref[:16]}... [{self.status}]"
