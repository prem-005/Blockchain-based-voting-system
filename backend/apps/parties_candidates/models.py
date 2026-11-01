from django.db import models
from django.core.exceptions import ValidationError
from apps.elections.models import Election, District, Constituency

class Party(models.Model):
    name = models.CharField(max_length=150, unique=True)
    abbreviation = models.CharField(max_length=20, unique=True)
    symbol_name = models.CharField(max_length=100)
    symbol_image = models.ImageField(upload_to='party_symbols/', null=True, blank=True)
    symbol_url = models.URLField(blank=True, default='')
    color_hex = models.CharField(max_length=7, default='#1E40AF', help_text="Hex color code e.g. #1E40AF")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Parties'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.abbreviation})"

class Candidate(models.Model):
    candidate_id = models.IntegerField(null=True, blank=True, help_text="On-chain candidate ID in LightVote smart contract")
    candidate_ref = models.CharField(max_length=66, unique=True, help_text="Unique candidate reference hash")
    name = models.CharField(max_length=150)
    party = models.ForeignKey(Party, on_delete=models.PROTECT, related_name='candidates')
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='candidates')
    district = models.ForeignKey(District, on_delete=models.PROTECT, related_name='candidates')
    constituency = models.ForeignKey(Constituency, on_delete=models.PROTECT, related_name='candidates')
    photo = models.ImageField(upload_to='candidate_photos/', null=True, blank=True)
    photo_url = models.URLField(blank=True, default='')
    affidavit_summary = models.TextField(blank=True, help_text="Public educational and asset disclosure summary")
    is_active = models.BooleanField(default=True)
    on_chain_tx_hash = models.CharField(max_length=66, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['election', 'constituency', 'name']
        unique_together = ('election', 'constituency', 'name')

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
        return f"{self.name} [{self.party.abbreviation}] - {self.constituency.name} ({self.election.year})"
