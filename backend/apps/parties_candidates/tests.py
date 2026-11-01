from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

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
