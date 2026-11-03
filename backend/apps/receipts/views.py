import io
import hashlib
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from .models import VoteReceipt
from .serializers import VoteReceiptSerializer, RecordReceiptSerializer
from apps.elections.models import Constituency
from .blockchain import get_verified_vote_transaction, get_web3, load_contract_config
from apps.voters.eligibility import derive_nullifier

class RecordVoteReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RecordReceiptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        election = serializer.validated_data['election']
        constituency = serializer.validated_data['constituency']
        nullifier_hash = serializer.validated_data['nullifier_hash'].lower()
        tx_hash = serializer.validated_data['tx_hash'].lower()

        voter = getattr(request.user, 'voter_profile', None)
        if not voter or not request.user.is_verified:
            return Response({'error': 'A verified voter account is required to record a receipt.'}, status=status.HTTP_403_FORBIDDEN)
        if voter.constituency_id != constituency.pk:
            return Response({'error': 'Receipt constituency does not match your approved voter profile.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            chain_data = get_verified_vote_transaction(tx_hash)
        except ConnectionError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except LookupError as error:
            return Response({'error': str(error)}, status=status.HTTP_409_CONFLICT)
        except (ValueError, RuntimeError) as error:
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Could not verify this vote transaction on the configured chain.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if (chain_data['election_id'] != election.pk or chain_data['call_election_id'] != election.pk or
                chain_data['constituency_id'] != constituency.pk or chain_data['call_constituency_id'] != constituency.pk or
                chain_data['nullifier_hash'].lower() != nullifier_hash or chain_data['call_nullifier_hash'].lower() != nullifier_hash):
            return Response({'error': 'Submitted receipt fields do not match the confirmed vote transaction.'}, status=status.HTTP_400_BAD_REQUEST)
        expected_nullifier = '0x' + derive_nullifier(request.user.pk, election.pk).hex()
        if nullifier_hash != expected_nullifier.lower():
            return Response({'error': 'This vote transaction does not belong to the authenticated voter account.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            candidate = get_web3().eth.contract(
                address=chain_data['contract_address'],
                abi=load_contract_config()['LightVote']['abi'],
            ).functions.getCandidate(chain_data['candidate_id']).call()
        except Exception:
            return Response({'error': 'The vote transaction refers to a candidate that cannot be verified.'}, status=status.HTTP_400_BAD_REQUEST)
        # A successful castVote transaction proves the candidate was active
        # at that block. Current active status may have changed afterward.
        if int(candidate[4]) != election.pk or int(candidate[6]) != constituency.pk:
            return Response({'error': 'Candidate election or constituency does not match this receipt.'}, status=status.HTTP_400_BAD_REQUEST)

        receipt_ref = '0x' + hashlib.sha256(
            f"{election.pk}:{constituency.pk}:{tx_hash}:{nullifier_hash}".encode('utf-8')
        ).hexdigest()
        try:
            with transaction.atomic():
                voter = type(voter).objects.select_for_update().get(pk=voter.pk)
                if not request.user.is_verified:
                    return Response({'error': 'Voter email verification changed before the receipt was recorded.'}, status=status.HTTP_409_CONFLICT)
                if VoteReceipt.objects.filter(election=election, user=request.user).exists():
                    return Response({'error': 'A vote receipt is already recorded for your account in this election.'}, status=status.HTTP_409_CONFLICT)
                receipt = VoteReceipt.objects.create(
                    receipt_ref=receipt_ref,
                    election=election,
                    constituency=constituency,
                    user=request.user,
                    tx_hash=tx_hash,
                    block_number=chain_data['block_number'],
                    block_hash=chain_data['block_hash'],
                    nullifier_hash=nullifier_hash,
                    gas_used=chain_data['gas_used'],
                    status=VoteReceipt.VerificationStatus.CONFIRMED,
                )
        except IntegrityError:
            return Response({'error': 'This transaction or nullifier already has a receipt.'}, status=status.HTTP_409_CONFLICT)

        return Response(VoteReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)

class MyReceiptsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        receipts = VoteReceipt.objects.filter(user=request.user)[:200]
        rows = VoteReceiptSerializer(receipts, many=True).data
        for row in rows:
            try:
                verified = get_verified_vote_transaction(row['tx_hash'])
                row.update({'chain_status': 'CONFIRMED', 'block_number': verified['block_number'],
                            'block_hash': verified['block_hash'], 'gas_used': verified['gas_used']})
            except ConnectionError:
                row.update({'chain_status': 'CHAIN_UNAVAILABLE', 'block_number': None, 'block_hash': '', 'gas_used': None})
            except Exception:
                row.update({'chain_status': 'NOT_VERIFIED_ON_CURRENT_CHAIN', 'block_number': None, 'block_hash': '', 'gas_used': None})
        return Response(rows)

class VerifyReceiptView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, query_ref):
        receipt = VoteReceipt.objects.filter(tx_hash__iexact=query_ref).first()
        if not receipt:
            receipt = VoteReceipt.objects.filter(receipt_ref__iexact=query_ref).first()
        tx_hash = receipt.tx_hash if receipt else query_ref
        try:
            chain_data = get_verified_vote_transaction(tx_hash)
        except ConnectionError:
            return Response({'status': 'CHAIN_UNAVAILABLE', 'message': 'The configured chain RPC is unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except LookupError:
            if receipt:
                return Response({
                    'status': 'NOT_ON_CURRENT_CHAIN',
                    'message': 'A saved receipt exists, but its transaction is not available on the currently configured chain.',
                    'node_connected': True,
                    'receipt': VoteReceiptSerializer(receipt).data,
                    'on_chain_data': None,
                }, status=status.HTTP_409_CONFLICT)
            return Response({
                'status': 'NOT_FOUND',
                'message': 'No vote transaction or saved receipt matches this reference on the configured chain.',
                'node_connected': True,
            }, status=status.HTTP_404_NOT_FOUND)
        except ValueError as error:
            return Response({'status': 'INVALID', 'message': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'status': 'CHAIN_UNAVAILABLE', 'message': 'Could not verify this receipt on the configured chain.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if receipt and (receipt.election_id != chain_data['election_id'] or
                        receipt.constituency_id != chain_data['constituency_id'] or
                        receipt.nullifier_hash.lower() != chain_data['nullifier_hash'].lower()):
            return Response({'status': 'RECEIPT_MISMATCH', 'message': 'Saved receipt fields do not match the confirmed chain event.'}, status=status.HTTP_409_CONFLICT)
        return Response({
            'status': 'VERIFIED_SUCCESSFUL',
            'node_connected': True,
            'receipt': VoteReceiptSerializer(receipt).data if receipt else None,
            'on_chain_data': {
                'block_number': chain_data['block_number'],
                'block_hash': chain_data['block_hash'],
                'gas_used': chain_data['gas_used'],
                'status': 'SUCCESS',
                'timestamp': chain_data['timestamp'],
                'contract_address': chain_data['contract_address'],
                'logs_count': chain_data['logs_count'],
            }
        })

class DownloadReceiptPDFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, query_ref):
        receipt = VoteReceipt.objects.filter(receipt_ref__iexact=query_ref).first()
        if not receipt:
            receipt = VoteReceipt.objects.filter(tx_hash__iexact=query_ref).first()

        if not receipt:
            return Response({'error': 'Receipt not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            chain_data = get_verified_vote_transaction(receipt.tx_hash)
        except ConnectionError:
            return Response({'error': 'The configured blockchain RPC is unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (LookupError, ValueError):
            return Response({'error': 'This receipt is not verified on the current chain.'}, status=status.HTTP_409_CONFLICT)
        except Exception:
            return Response({'error': 'Could not verify this receipt on the current chain.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if (chain_data['election_id'] != receipt.election_id or
                chain_data['constituency_id'] != receipt.constituency_id or
                chain_data['nullifier_hash'].lower() != receipt.nullifier_hash.lower()):
            return Response({'error': 'Saved receipt does not match the chain record.'}, status=status.HTTP_409_CONFLICT)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        story = []

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#1E3A8A'), # Navy Blue
            alignment=1 # Center
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=11,
            leading=15,
            textColor=colors.HexColor('#059669'), # Emerald Green
            alignment=1
        )
        body_style = styles['Normal']
        body_style.fontSize = 10
        body_style.leading = 14

        # Header
        story.append(Paragraph("LIGHTVOTE ELECTRONIC VOTING COMMISSION", title_style))
        story.append(Paragraph("LightVote Research Prototype Transaction Receipt", subtitle_style))
        story.append(Spacer(1, 15))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1E3A8A'), spaceAfter=15))

        # Receipt Summary Table
        data = [
            [Paragraph("<b>Receipt Reference:</b>", body_style), Paragraph(receipt.receipt_ref, body_style)],
            [Paragraph("<b>Election Name:</b>", body_style), Paragraph(f"{receipt.election.name} ({receipt.election.year})", body_style)],
            [Paragraph("<b>Constituency:</b>", body_style), Paragraph(f"AC-{receipt.constituency.id}: {receipt.constituency.name} ({receipt.constituency.district.name})", body_style)],
            [Paragraph("<b>Transaction Hash:</b>", body_style), Paragraph(receipt.tx_hash, body_style)],
            [Paragraph("<b>Block Number:</b>", body_style), Paragraph(str(chain_data['block_number']), body_style)],
            [Paragraph("<b>Timestamp (UTC):</b>", body_style), Paragraph(receipt.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"), body_style)],
            [Paragraph("<b>Anonymous Nullifier Hash:</b>", body_style), Paragraph(receipt.nullifier_hash, body_style)],
            [Paragraph("<b>Gas Units Used:</b>", body_style), Paragraph(str(chain_data['gas_used']), body_style)],
            [Paragraph("<b>Verification Status:</b>", body_style), Paragraph("<font color='#059669'><b>CONFIRMED ON BLOCKCHAIN</b></font>", body_style)],
        ]

        t = Table(data, colWidths=[160, 360])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 20))

        # Privacy & Verification Notice
        notice_text = (
            "<b>Prototype privacy limitation:</b> This receipt omits your name and voter ID. "
            "The public vote transaction exposes both the selected candidate ID in calldata and the sender wallet. "
            "The nullifier can verify that a credential was used once, but this protocol does not provide ballot secrecy."
        )
        story.append(Paragraph(notice_text, body_style))
        story.append(Spacer(1, 15))

        instructions = (
            "<b>How to verify your receipt:</b><br/>"
            "1. Visit the LightVote public portal at <i>/verify-receipt</i>.<br/>"
            "2. Input the Transaction Hash or Anonymous Receipt Reference above.<br/>"
            "3. Inspect the live block number, transaction receipt, and smart contract event."
        )
        story.append(Paragraph(instructions, body_style))

        doc.build(story)
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="lightvote_receipt_{receipt.receipt_ref[:10]}.pdf"'
        return response
