from django.urls import path
from .views import PartyListCreateView, PartyDetailView, CandidateListCreateView, CandidateDetailView

urlpatterns = [
    path('parties/', PartyListCreateView.as_view(), name='party-list-create'),
    path('parties/<int:pk>/', PartyDetailView.as_view(), name='party-detail'),
    path('candidates/', CandidateListCreateView.as_view(), name='candidate-list-create'),
    path('candidates/<int:pk>/', CandidateDetailView.as_view(), name='candidate-detail'),
]
