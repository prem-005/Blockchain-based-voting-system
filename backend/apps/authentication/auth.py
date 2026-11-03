from rest_framework.authentication import SessionAuthentication
from django.http import JsonResponse


def csrf_failure(request, reason=''):
    return JsonResponse(
        {'error': 'CSRF validation failed. Refresh the page and try again.'},
        status=403,
    )

class CsrfProtectedSessionAuthentication(SessionAuthentication):
    """Session authentication with Django's normal CSRF checks enabled."""
    def enforce_csrf(self, request):
        return super().enforce_csrf(request)
