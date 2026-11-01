from rest_framework.permissions import BasePermission

from .models import User


class IsElectionAdministrator(BasePermission):
    message = 'Administrator privileges are required.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and
            (user.is_superuser or user.role in (User.Role.CENTRAL_ADMIN, User.Role.DISTRICT_ADMIN))
        )


class IsCentralAdministrator(BasePermission):
    message = 'Central administrator privileges are required.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and
            (user.is_superuser or user.role == User.Role.CENTRAL_ADMIN)
        )
