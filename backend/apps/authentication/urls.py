from django.urls import path
from .views import AdminAccountDetailView, AdminAccountListCreateView, CsrfCookieView, SendOTPView, VerifyOTPView, LoginView, LogoutView, MeView, TestEmailView

urlpatterns = [
    path('csrf/', CsrfCookieView.as_view(), name='csrf-cookie'),
    path('test-email/', TestEmailView.as_view(), name='test-email'),
    path('send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('admins/', AdminAccountListCreateView.as_view(), name='admin-account-list-create'),
    path('admins/<int:pk>/', AdminAccountDetailView.as_view(), name='admin-account-detail'),
]
