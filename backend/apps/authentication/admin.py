from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.core.exceptions import ValidationError
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User that enforces a single superuser in the system."""

    def save_model(self, request, obj, form, change):
        # If attempting to set a user as superuser, ensure no other superuser exists (excluding self on edit)
        if obj.is_superuser:
            qs = User.objects.filter(is_superuser=True)
            if change:
                qs = qs.exclude(pk=obj.pk)
            if qs.exists():
                raise ValidationError(
                    "Only one admin (superuser) is allowed in the system.")
        super().save_model(request, obj, form, change)
