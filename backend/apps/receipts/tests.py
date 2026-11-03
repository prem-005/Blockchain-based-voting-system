from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.elections.models import Constituency, District, Election, State
from apps.parties_candidates.models import Candidate, Party
from apps.receipts.models import VoteReceipt
from apps.voters.models import Voter
from apps.voters.eligibility import derive_nullifier

User = get_user_model()


class RecordConfirmedVoteReceiptTests(TestCase):
    def setUp(self):
        state = State.objects.create(name='Tamil Nadu', code='TN')
        district = District.objects.create(id=29, name='Tiruchirappalli', code='TN-TRY', state=state)
        constituency = Constituency.objects.create(id=141, name='Manachanallur', district=district)
        election = Election.objects.create(
            id=202601, name='Assembly Election', year=2026, scope=Election.Scope.STATE_ASSEMBLY,
            state=state, start_time='2026-01-01T00:00:00Z', end_time='2026-01-02T00:00:00Z',
            status=Election.Status.ENDED,
        )
        party = Party.objects.create(name='Test Party', abbreviation='TST', symbol_name='Star')
        self.candidate = Candidate.objects.create(
            candidate_id=42, candidate_ref='candidate-ref', name='Candidate', party=party,
            election=election, district=district, constituency=constituency, is_active=False,
        )
        self.user = User.objects.create_user(email='voter@example.test', is_verified=True)
        Voter.objects.create(
            user=self.user, voter_id_number='EPIC-TEST-1', full_name='Test Voter',
            date_of_birth=date(1980, 1, 1), mobile_number='9876543210', state=state,
            district=district, constituency=constituency, status=Voter.Status.REJECTED,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.tx_hash = '0x' + '1' * 64
        self.nullifier = '0x' + derive_nullifier(self.user.pk, election.pk).hex()
        self.chain_data = {
            'election_id': election.pk,
            'call_election_id': election.pk,
            'constituency_id': constituency.pk,
            'call_constituency_id': constituency.pk,
            'nullifier_hash': self.nullifier,
            'call_nullifier_hash': self.nullifier,
            'candidate_id': self.candidate.candidate_id,
            'contract_address': '0x' + '2' * 40,
            'block_number': 123,
            'block_hash': '0x' + '3' * 64,
            'gas_used': 100000,
        }

    @patch('apps.receipts.views.load_contract_config', return_value={'LightVote': {'abi': []}})
    @patch('apps.receipts.views.get_web3')
    @patch('apps.receipts.views.get_verified_vote_transaction')
    def test_persists_confirmed_vote_after_election_end_and_candidate_withdrawal(
        self, verify_transaction, get_web3, _load_contract_config,
    ):
        verify_transaction.return_value = self.chain_data
        candidate_tuple = (
            self.candidate.candidate_id, b'\x00' * 32, self.candidate.name, 'TST',
            self.candidate.election_id, self.candidate.district_id,
            self.candidate.constituency_id, False,
        )
        candidate_call = SimpleNamespace(call=lambda: candidate_tuple)
        fake_contract = SimpleNamespace(functions=SimpleNamespace(
            getCandidate=lambda _candidate_id: candidate_call,
        ))
        get_web3.return_value = SimpleNamespace(eth=SimpleNamespace(
            contract=lambda **_kwargs: fake_contract,
        ))

        response = self.client.post('/api/receipts/record/', {
            'election': self.candidate.election_id,
            'constituency': self.candidate.constituency_id,
            'tx_hash': self.tx_hash,
            'nullifier_hash': self.nullifier,
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(VoteReceipt.objects.filter(tx_hash=self.tx_hash).exists())

    @patch('apps.receipts.views.load_contract_config', return_value={'LightVote': {'abi': []}})
    @patch('apps.receipts.views.get_web3')
    @patch('apps.receipts.views.get_verified_vote_transaction')
    def test_voter_cannot_claim_another_accounts_public_vote_transaction(
        self, verify_transaction, get_web3, _load_contract_config,
    ):
        verify_transaction.return_value = self.chain_data
        other_user = User.objects.create_user(email='other-voter@example.test', is_verified=True)
        Voter.objects.create(
            user=other_user, voter_id_number='EPIC-TEST-2', full_name='Other Voter',
            date_of_birth=date(1980, 1, 1), mobile_number='9876543211',
            state=self.candidate.district.state, district=self.candidate.district,
            constituency=self.candidate.constituency, status=Voter.Status.APPROVED,
        )
        self.client.force_authenticate(other_user)

        response = self.client.post('/api/receipts/record/', {
            'election': self.candidate.election_id,
            'constituency': self.candidate.constituency_id,
            'tx_hash': self.tx_hash,
            'nullifier_hash': self.nullifier,
        }, format='json')

        self.assertEqual(response.status_code, 403)
        self.assertFalse(VoteReceipt.objects.filter(tx_hash=self.tx_hash).exists())
        get_web3.assert_not_called()
