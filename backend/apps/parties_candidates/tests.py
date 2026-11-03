from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from unittest.mock import patch

from apps.elections.models import Constituency, District, Election, State
from apps.parties_candidates.models import Candidate, Party


User = get_user_model()


class CandidateDistrictScopeTests(TestCase):
    def setUp(self):
        state = State.objects.create(name='Tamil Nadu', code='TN')
        self.trichy = District.objects.create(id=29, name='Tiruchirappalli', code='TN-TRY', state=state)
        self.chennai = District.objects.create(id=3, name='Chennai', code='TN-CHN', state=state)
        self.trichy_constituency = Constituency.objects.create(id=141, name='Manachanallur', district=self.trichy)
        self.chennai_constituency = Constituency.objects.create(id=17, name='Royapuram', district=self.chennai)
        self.election = Election.objects.create(
            id=202601,
            name='Tamil Nadu Assembly Election 2026',
            year=2026,
            scope=Election.Scope.STATE_ASSEMBLY,
            state=state,
            start_time=timezone.now() - timedelta(days=1),
            end_time=timezone.now() + timedelta(days=1),
            status=Election.Status.ACTIVE,
        )
        party = Party.objects.create(name='Test Party', abbreviation='TST', symbol_name='Star')
        self.new_party = Party.objects.create(name='Other Party', abbreviation='OTH', symbol_name='Moon')
        self.trichy_candidate = Candidate.objects.create(
            candidate_id=1, candidate_ref='trichy-candidate', name='Trichy Candidate', party=party,
            election=self.election, district=self.trichy, constituency=self.trichy_constituency,
        )
        self.chennai_candidate = Candidate.objects.create(
            candidate_id=2, candidate_ref='chennai-candidate', name='Chennai Candidate', party=party,
            election=self.election, district=self.chennai, constituency=self.chennai_constituency,
        )
        self.district_admin = User.objects.create_user(
            email='dro@example.test', role=User.Role.DISTRICT_ADMIN, assigned_district_id=self.trichy.id,
        )
        self.central_admin = User.objects.create_user(email='central@example.test', role=User.Role.CENTRAL_ADMIN)
        self.client = APIClient()

    def candidate_payload(self):
        return {
            'name': 'API Candidate',
            'party': self.new_party.pk,
            'election': self.election.pk,
            'district': self.trichy.pk,
            'constituency': self.trichy_constituency.pk,
            'registration_tx_hash': '0x' + '9' * 64,
        }

    def verified_candidate(self, constituency_id=None):
        return {
            'candidate_id': 99,
            'candidate_ref': '0x' + 'a' * 64,
            'name': 'API Candidate',
            'party_abbreviation': 'OTH',
            'election_id': self.election.pk,
            'district_id': self.trichy.pk,
            'constituency_id': constituency_id or self.trichy_constituency.pk,
            'tx_hash': '0x' + '9' * 64,
        }

    def test_district_admin_list_is_limited_to_assigned_district(self):
        self.client.force_authenticate(self.district_admin)

        response = self.client.get('/api/candidates/candidates/')

        self.assertEqual(response.status_code, 200)
        items = response.data.get('results', response.data)
        self.assertEqual([item['id'] for item in items], [self.trichy_candidate.id])

    def test_district_admin_cannot_retrieve_candidate_in_another_district(self):
        self.client.force_authenticate(self.district_admin)

        response = self.client.get(f'/api/candidates/candidates/{self.chennai_candidate.id}/')

        self.assertEqual(response.status_code, 404)

    def test_central_admin_can_list_candidates_across_districts(self):
        self.client.force_authenticate(self.central_admin)

        response = self.client.get('/api/candidates/candidates/')

        self.assertEqual(response.status_code, 200)
        items = response.data.get('results', response.data)
        self.assertEqual({item['id'] for item in items}, {self.trichy_candidate.id, self.chennai_candidate.id})

    @patch('apps.parties_candidates.serializers.get_verified_candidate_registration')
    def test_central_admin_can_save_a_verified_on_chain_candidate(self, verify_registration):
        verify_registration.return_value = self.verified_candidate()
        self.client.force_authenticate(self.central_admin)

        response = self.client.post('/api/candidates/candidates/', self.candidate_payload(), format='json')

        self.assertEqual(response.status_code, 201, response.data)
        candidate = Candidate.objects.get(candidate_id=99)
        self.assertEqual(candidate.constituency_id, self.trichy_constituency.pk)
        self.assertEqual(candidate.on_chain_tx_hash, '0x' + '9' * 64)

    @patch('apps.parties_candidates.serializers.get_verified_candidate_registration')
    def test_candidate_chain_constituency_must_match_database_selection(self, verify_registration):
        verify_registration.return_value = self.verified_candidate(constituency_id=self.chennai_constituency.pk)
        self.client.force_authenticate(self.central_admin)

        response = self.client.post('/api/candidates/candidates/', self.candidate_payload(), format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Candidate.objects.filter(candidate_id=99).exists())
