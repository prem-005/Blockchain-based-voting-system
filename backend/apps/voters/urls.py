from django.urls import path
from .views import (
    VoterRegistrationView,
    MyVoterProfileView,
    VoterAdminListView,
    VoterReviewView,
    VoterAuditLogsView,
    EligibilityRootsView,
    BallotCredentialView,
    VoterWalletBindingChallengeView,
    VoterWalletBindingConfirmView,
)

urlpatterns = [
    path('register/', VoterRegistrationView.as_view(), name='voter-register'),
    path('profile/', MyVoterProfileView.as_view(), name='voter-profile'),
    path('admin/list/', VoterAdminListView.as_view(), name='voter-admin-list'),
    path('admin/<int:pk>/review/', VoterReviewView.as_view(), name='voter-review'),
    path('admin/<int:pk>/audit-logs/', VoterAuditLogsView.as_view(), name='voter-audit-logs'),
    path('admin/eligibility-roots/', EligibilityRootsView.as_view(), name='eligibility-roots'),
    path('ballot-credential/', BallotCredentialView.as_view(), name='ballot-credential'),
    path('wallet-binding/challenge/', VoterWalletBindingChallengeView.as_view(), name='wallet-binding-challenge'),
    path('wallet-binding/confirm/', VoterWalletBindingConfirmView.as_view(), name='wallet-binding-confirm'),
]
