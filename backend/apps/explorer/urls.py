from django.urls import path
from .views import ExplorerBlocksView, ExplorerTransactionsView, ExplorerTransactionDetailView

urlpatterns = [
    path('blocks/', ExplorerBlocksView.as_view(), name='explorer-blocks'),
    path('transactions/', ExplorerTransactionsView.as_view(), name='explorer-transactions'),
    path('transactions/<str:tx_hash>/', ExplorerTransactionDetailView.as_view(), name='explorer-transaction-detail'),
]
