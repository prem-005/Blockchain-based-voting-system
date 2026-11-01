from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from web3 import Web3
from apps.receipts.models import VoteReceipt
from apps.receipts.serializers import VoteReceiptSerializer
from apps.receipts.blockchain import get_verified_vote_transaction

class ExplorerBlocksView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        w3 = Web3(Web3.HTTPProvider(settings.HARDHAT_RPC_URL))
        blocks = []

        if w3.is_connected():
            try:
                latest_block = w3.eth.block_number
                start_block = max(0, latest_block - 9)
                for b_num in range(latest_block, start_block - 1, -1):
                    b = w3.eth.get_block(b_num, full_transactions=False)
                    blocks.append({
                        'number': b['number'],
                        'hash': b['hash'].hex(),
                        'parent_hash': b['parentHash'].hex(),
                        'timestamp': b['timestamp'],
                        'transaction_count': len(b['transactions']),
                        'gas_used': b['gasUsed'],
                        'gas_limit': b['gasLimit'],
                    })
            except Exception:
                pass

        return Response({
            'connected': w3.is_connected(),
            'blocks': blocks
        })

class ExplorerTransactionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        receipts = VoteReceipt.objects.select_related('election', 'constituency').all()

        election_id = request.query_params.get('election_id')
        year = request.query_params.get('year')

        if election_id:
            receipts = receipts.filter(election_id=election_id)
        if year:
            receipts = receipts.filter(election__year=year)

        rows = VoteReceiptSerializer(receipts[:50], many=True).data
        for row in rows:
            try:
                verified = get_verified_vote_transaction(row['tx_hash'])
                row.update({
                    'chain_status': 'CONFIRMED',
                    'block_number': verified['block_number'],
                    'block_hash': verified['block_hash'],
                    'gas_used': verified['gas_used'],
                })
            except ConnectionError:
                row.update({'chain_status': 'CHAIN_UNAVAILABLE', 'block_number': None, 'block_hash': '', 'gas_used': None})
            except Exception:
                row.update({'chain_status': 'NOT_VERIFIED_ON_CURRENT_CHAIN', 'block_number': None, 'block_hash': '', 'gas_used': None})

        return Response({
            'count': receipts.count(),
            'transactions': rows
        })

class ExplorerTransactionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, tx_hash):
        w3 = Web3(Web3.HTTPProvider(settings.HARDHAT_RPC_URL))
        receipt = VoteReceipt.objects.filter(tx_hash__iexact=tx_hash).first()

        on_chain = None
        if w3.is_connected():
            try:
                tx = w3.eth.get_transaction(tx_hash)
                tx_rec = w3.eth.get_transaction_receipt(tx_hash)
                block = w3.eth.get_block(tx_rec['blockNumber'])
                on_chain = {
                    'tx_hash': tx['hash'].hex(),
                    'block_number': tx_rec['blockNumber'],
                    'block_hash': tx_rec['blockHash'].hex(),
                    'from': tx['from'],
                    'to': tx['to'],
                    'gas_used': tx_rec['gasUsed'],
                    'gas_price': tx['gasPrice'],
                    'status': 'CONFIRMED' if tx_rec['status'] == 1 else 'FAILED',
                    'timestamp': block['timestamp'],
                }
            except Exception:
                pass

        return Response({
            'receipt': VoteReceiptSerializer(receipt).data if receipt else None,
            'on_chain': on_chain
        })
