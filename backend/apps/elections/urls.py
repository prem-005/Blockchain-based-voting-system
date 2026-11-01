from django.urls import path
from .views import StateListView, DistrictListView, ConstituencyListView, ElectionListCreateView, ElectionDetailView, ElectionStatusControlView, ElectionChainSyncView

urlpatterns = [
    path('states/', StateListView.as_view(), name='state-list'),
    path('districts/', DistrictListView.as_view(), name='district-list'),
    path('constituencies/', ConstituencyListView.as_view(), name='constituency-list'),
    path('elections/', ElectionListCreateView.as_view(), name='election-list-create'),
    path('elections/<int:pk>/', ElectionDetailView.as_view(), name='election-detail'),
    path('elections/<int:pk>/status-control/', ElectionStatusControlView.as_view(), name='election-status-control'),
    path('elections/<int:pk>/sync-from-chain/', ElectionChainSyncView.as_view(), name='election-sync-from-chain'),
]
