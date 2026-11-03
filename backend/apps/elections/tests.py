from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.elections.models import Constituency, District, Election, State
from apps.parties_candidates.models import Candidate, Party
from apps.receipts.models import VoteReceipt

User = get_user_model()


class ElectionDeletionHistoryProtectionTests(TestCase):
    def setUp(self):
        state = State.objects.create(name='Tamil Nadu', code='TN')
        district = District.objects.create(id=29, name='Tiruchirappalli', code='TN-TRY', state=state)
        constituency = Constituency.objects.create(id=141, name='Manachanallur', district=district)
        self.election = Election.objects.create(
            id=202601, name='Assembly Election', year=2026, scope=Election.Scope.STATE_ASSEMBLY,
            state=state, start_time=timezone.now(), end_time=timezone.now() + timedelta(days=1),
        )
        party = Party.objects.create(name='Test Party', abbreviation='TST', symbol_name='Star')
        candidate = Candidate.objects.create(
            candidate_id=1, candidate_ref='candidate-history', name='Candidate', party=party,
            election=self.election, district=district, constituency=constituency,
        )
        VoteReceipt.objects.create(
            receipt_ref='0x' + '4' * 64, election=self.election, constituency=constituency,
            tx_hash='0x' + '5' * 64, nullifier_hash='0x' + '6' * 64,
            status=VoteReceipt.VerificationStatus.CONFIRMED,
        )
        self.candidate = candidate
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user(
            email='central@example.test', role=User.Role.CENTRAL_ADMIN,
        ))

    @patch('apps.elections.views.load_contract_config', return_value={'ElectionManager': {'address': '0x' + '1' * 40, 'abi': []}})
    @patch('apps.elections.views.get_web3')
    def test_legacy_election_with_candidates_or_receipts_is_preserved(self, get_web3, _load_config):
        chain_election = (self.election.pk, '', 2026, '', 0, 0, 0, False, 0)
        call = SimpleNamespace(call=lambda: chain_election)
        manager = SimpleNamespace(functions=SimpleNamespace(
            elections=lambda _election_id: call,
        ))
        get_web3.return_value = SimpleNamespace(
            is_connected=lambda: True,
            eth=SimpleNamespace(contract=lambda **_kwargs: manager),
        )

        response = self.client.delete(f'/api/elections/elections/{self.election.pk}/')

        self.assertEqual(response.status_code, 409)
        self.assertTrue(Election.objects.filter(pk=self.election.pk).exists())
        self.assertTrue(Candidate.objects.filter(pk=self.candidate.pk).exists())
        self.assertEqual(VoteReceipt.objects.filter(election=self.election).count(), 1)
