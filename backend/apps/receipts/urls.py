from django.urls import path
from .views import RecordVoteReceiptView, MyReceiptsView, VerifyReceiptView, DownloadReceiptPDFView

urlpatterns = [
    path('record/', RecordVoteReceiptView.as_view(), name='record-receipt'),
    path('my-receipts/', MyReceiptsView.as_view(), name='my-receipts'),
    path('verify/<str:query_ref>/', VerifyReceiptView.as_view(), name='verify-receipt'),
    path('download-pdf/<str:query_ref>/', DownloadReceiptPDFView.as_view(), name='download-receipt-pdf'),
]
