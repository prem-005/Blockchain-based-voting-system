import secrets
import string
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
from datetime import timedelta

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        user = self.model(email=email, username=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        # Enforce a single superuser (admin) in the system
        if self.model.objects.filter(is_superuser=True).exists():
            raise ValueError('A superuser already exists. Only one admin is allowed.')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.CENTRAL_ADMIN)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    class Role(models.TextChoices):
        CENTRAL_ADMIN = 'CENTRAL_ADMIN', 'Central Admin'
        DISTRICT_ADMIN = 'DISTRICT_ADMIN', 'District Admin'
        VOTER = 'VOTER', 'Voter'

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VOTER)
    assigned_district_id = models.IntegerField(null=True, blank=True, help_text="Assigned District ID for District Admins")
    is_verified = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

class OTPToken(models.Model):
    PURPOSE_CHOICES = [
        ('LOGIN', 'Login Verification'),
        ('REGISTRATION', 'Registration Verification'),
        ('BALLOT_ACCESS', 'Ballot Access Authorization'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_tokens')
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='LOGIN')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)

    class Meta:
        ordering = ['-created_at']

    @classmethod
    def generate_otp(cls, user, purpose='LOGIN', validity_minutes=5):
        # Invalidate any active unused tokens for the same user & purpose
        cls.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)

        digits = string.digits
        otp = ''.join(secrets.choice(digits) for _ in range(6))
        expires = timezone.now() + timedelta(minutes=validity_minutes)

        token = cls.objects.create(
            user=user,
            otp_code=otp,
            purpose=purpose,
            expires_at=expires
        )
        return token

    def verify(self, code):
        if self.is_used:
            return False, "OTP has already been used."
        if timezone.now() > self.expires_at:
            self.is_used = True
            self.save(update_fields=['is_used'])
            return False, "OTP has expired. Please request a new code."
        if self.attempts >= self.max_attempts:
            self.is_used = True
            self.save(update_fields=['is_used'])
            return False, "Maximum verification attempts exceeded."

        self.attempts += 1
        self.save(update_fields=['attempts'])

        if self.otp_code == code.strip():
            self.is_used = True
            self.save(update_fields=['is_used'])
            return True, "Verification successful."

        remaining = self.max_attempts - self.attempts
        return False, f"Invalid OTP code. {remaining} attempt(s) remaining."
