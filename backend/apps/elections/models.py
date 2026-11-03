from django.db import models
from django.utils import timezone

class State(models.Model):
    name = models.CharField(max_length=100, default='Tamil Nadu', unique=True)
    code = models.CharField(max_length=10, default='TN', unique=True)

    def __str__(self):
        return self.name

class District(models.Model):
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='districts')
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.id}. {self.name}"

class Constituency(models.Model):
    CATEGORY_CHOICES = [
        ('GEN', 'General'),
        ('SC', 'Scheduled Caste'),
        ('ST', 'Scheduled Tribe'),
    ]

    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='constituencies')
    id = models.IntegerField(primary_key=True, help_text="Official ECI Assembly Constituency Number (1 to 234)")
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='GEN')

    class Meta:
        ordering = ['id']
        verbose_name_plural = 'Constituencies'

    def __str__(self):
        return f"AC-{self.id}: {self.name} ({self.district.name})"

class Election(models.Model):
    class Status(models.TextChoices):
        UPCOMING = 'UPCOMING', 'Upcoming'
        ACTIVE = 'ACTIVE', 'Active'
        ENDED = 'ENDED', 'Ended'
        RESULTS_PUBLISHED = 'RESULTS_PUBLISHED', 'Results Published'
        ARCHIVED = 'ARCHIVED', 'Archived'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class Scope(models.TextChoices):
        STATE_ASSEMBLY = 'STATE_ASSEMBLY', 'State Legislative Assembly'
        PARLIAMENTARY = 'PARLIAMENTARY', 'Parliamentary (Lok Sabha)'
        BY_ELECTION = 'BY_ELECTION', 'By-Election'

    id = models.IntegerField(primary_key=True, help_text="Numeric election ID matching Solidity smart contract")
    name = models.CharField(max_length=200)
    year = models.PositiveSmallIntegerField(db_index=True)
    scope = models.CharField(max_length=30, choices=Scope.choices, default=Scope.STATE_ASSEMBLY)
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name='elections')
    constituencies = models.ManyToManyField(
        'Constituency', blank=True, related_name='elections',
        help_text='Selected Assembly Constituencies for a by-election. Empty means statewide scope for legacy elections.',
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=25, choices=Status.choices, default=Status.UPCOMING)
    on_chain_tx_hash = models.CharField(max_length=66, blank=True, null=True, help_text="Creation tx hash on blockchain")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year', '-created_at']

    def __str__(self):
        return f"[{self.year}] {self.name} ({self.get_status_display()})"

    @property
    def is_currently_open(self):
        now = timezone.now()
        return self.status == self.Status.ACTIVE and self.start_time <= now <= self.end_time
