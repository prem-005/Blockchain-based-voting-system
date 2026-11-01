from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Custom SessionAuthentication that skips CSRF enforcement for REST API calls
    originating from authorized SPA clients (handled by CORS_ALLOWED_ORIGINS and credentials).
    """
    def enforce_csrf(self, request):
        return  # To not perform the csrf check
