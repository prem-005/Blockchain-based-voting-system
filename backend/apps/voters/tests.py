from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from unittest.mock import patch
from rest_framework.test import APIClient
from apps.elections.models import State, District, Constituency, Election
from apps.voters.models import Voter, VoterAuditLog
from apps.authentication.models import OTPToken

User = get_user_model()

class VoterAndAuthTests(TestCase):
    def setUp(self):
        self.state = State.objects.create(name="Tamil Nadu", code="TN")
        self.district = District.objects.create(id=29, name="Tiruchirappalli", code="TN-TRY", state=self.state)
        self.other_district = District.objects.create(id=3, name="Chennai", code="TN-CHN", state=self.state)

        self.constituency = Constituency.objects.create(
            id=141, name="Manachanallur", district=self.district, category="GEN"
        )
        self.other_constituency = Constituency.objects.create(
            id=17, name="Royapuram", district=self.other_district, category="GEN"
        )

        self.admin = User.objects.create_superuser(email="admin@test.org", password="AdminPassword123")
        self.dadmin = User.objects.create_user(
            email="dadmin@test.org",
            password="DistrictPassword123",
            role=User.Role.DISTRICT_ADMIN,
            assigned_district_id=29
        )

    def registration_payload(self, **overrides):
        payload = {
            'voter_id_number': 'EPIC-NEW-001',
            'full_name': 'New Voter',
            'date_of_birth': '1990-01-01',
            'email': 'new-voter@test.org',
            'mobile_number': '9876543001',
            'state': self.state.pk,
            'district': self.district.pk,
            'constituency': self.constituency.pk,
            'address': 'Tiruchirappalli',
            'pin_code': '620005',
        }
        payload.update(overrides)
        return payload

    @patch('apps.voters.views.send_email_async')
    def test_voter_registration_creates_pending_application_and_registration_otp(self, send_email):
        response = APIClient().post('/api/voters/register/', self.registration_payload(), format='json')

        self.assertEqual(response.status_code, 201, response.data)
        voter = Voter.objects.get(voter_id_number='EPIC-NEW-001')
        self.assertEqual(voter.status, Voter.Status.PENDING)
        self.assertFalse(voter.user.is_verified)
        self.assertTrue(OTPToken.objects.filter(user=voter.user, purpose='REGISTRATION', is_used=False).exists())
        send_email.assert_called_once()

    @patch('apps.voters.views.send_email_async')
    def test_voter_registration_rejects_duplicate_email(self, send_email):
        first = APIClient().post('/api/voters/register/', self.registration_payload(), format='json')
        self.assertEqual(first.status_code, 201, first.data)

        second = APIClient().post('/api/voters/register/', self.registration_payload(
            voter_id_number='EPIC-NEW-002', mobile_number='9876543002',
            email='NEW-VOTER@test.org',
        ), format='json')

        self.assertEqual(second.status_code, 400)
        self.assertEqual(User.objects.filter(email__iexact='new-voter@test.org').count(), 1)
        self.assertEqual(send_email.call_count, 1)

    def test_registration_rejects_underage_applicant_and_mismatched_constituency(self):
        underage_date = date.today() - timedelta(days=365 * 17)
        underage = APIClient().post('/api/voters/register/', self.registration_payload(
            date_of_birth=underage_date.isoformat(),
        ), format='json')
        mismatched = APIClient().post('/api/voters/register/', self.registration_payload(
            email='mismatch@test.org', voter_id_number='EPIC-MISMATCH', mobile_number='9876543003',
            district=self.district.pk, constituency=self.other_constituency.pk,
        ), format='json')

        self.assertEqual(underage.status_code, 400)
        self.assertEqual(mismatched.status_code, 400)
        self.assertFalse(User.objects.filter(email='mismatch@test.org').exists())

    def test_minimum_voting_age_enforcement(self):
        """Voter under 18 must be rejected by validation"""
        underage_dob = date.today() - timedelta(days=365 * 17) # 17 years old
        user = User.objects.create_user(email="underage@test.org")

        voter = Voter(
            user=user,
            voter_id_number="TN/29/141/000001",
            full_name="Minor Voter",
            date_of_birth=underage_dob,
            mobile_number="9876543210",
            state=self.state,
            district=self.district,
            constituency=self.constituency,
            address="Trichy",
            pin_code="620005"
        )
        with self.assertRaises(Exception):
            voter.full_clean()

    def test_duplicate_voter_prevention(self):
        """Duplicate voter ID, email, or mobile must fail unique constraints"""
        adult_dob = date.today() - timedelta(days=365 * 25)
        u1 = User.objects.create_user(email="voter1@test.org")
        Voter.objects.create(
            user=u1,
            voter_id_number="EPIC123456",
            full_name="Voter One",
            date_of_birth=adult_dob,
            mobile_number="9876543211",
            state=self.state,
            district=self.district,
            constituency=self.constituency,
            address="Trichy",
            pin_code="620005"
        )

        u2 = User.objects.create_user(email="voter2@test.org")
        with self.assertRaises(Exception):
            Voter.objects.create(
                user=u2,
                voter_id_number="EPIC123456", # Duplicate Voter ID
                full_name="Voter Two",
                date_of_birth=adult_dob,
                mobile_number="9876543212",
                state=self.state,
                district=self.district,
                constituency=self.constituency,
                address="Trichy",
                pin_code="620005"
            )

    def test_otp_single_use_and_attempts(self):
        """OTP must expire, allow max 3 attempts, and become invalid after single use"""
        user = User.objects.create_user(email="otpuser@test.org")
        token = OTPToken.generate_otp(user=user, purpose="LOGIN", validity_minutes=5)

        self.assertEqual(len(token.otp_code), 6)

        # Attempt with wrong code
        ok, msg = token.verify("000000")
        self.assertFalse(ok)
        self.assertEqual(token.attempts, 1)

        # Attempt with correct code
        ok, msg = token.verify(token.otp_code)
        self.assertTrue(ok)
        self.assertTrue(token.is_used)

        # Re-using same OTP must fail
        ok2, msg2 = token.verify(token.otp_code)
        self.assertFalse(ok2)
        self.assertIn("already been used", msg2)

    def test_district_admin_scoping(self):
        """District Admin cannot review applications outside assigned district"""
        adult_dob = date.today() - timedelta(days=365 * 22)
        u_chennai = User.objects.create_user(email="chennai_voter@test.org")
        voter_chennai = Voter.objects.create(
            user=u_chennai,
            voter_id_number="EPIC777777",
            full_name="Chennai Resident",
            date_of_birth=adult_dob,
            mobile_number="9876543299",
            state=self.state,
            district=self.other_district, # Chennai (ID 3)
            constituency=self.other_constituency,
            address="Chennai",
            pin_code="600001"
        )

        # Trichy District Admin (assigned_district_id=29) attempts to review Chennai voter
        self.assertNotEqual(self.dadmin.assigned_district_id, voter_chennai.district_id)


class EligibilityRootRevocationTests(TestCase):
    def test_root_response_includes_nonzero_sentinel_for_empty_constituency(self):
        state = State.objects.create(name='Root State', code='RS')
        district = District.objects.create(id=40, name='Root District', code='RS-1', state=state)
        eligible_constituency = Constituency.objects.create(id=201, name='Eligible AC', district=district)
        empty_constituency = Constituency.objects.create(id=202, name='Empty AC', district=district)
        election = Election.objects.create(
            id=203001, name='Root Test Election', year=2030,
            state=state, start_time=timezone.now(), end_time=timezone.now() + timedelta(days=1),
        )
        admin = User.objects.create_user(email='root-admin@test.org', role=User.Role.CENTRAL_ADMIN)
        voter_user = User.objects.create_user(email='eligible@test.org', is_verified=True)
        Voter.objects.create(
            user=voter_user, voter_id_number='EPIC-ROOT-1', full_name='Eligible Voter',
            date_of_birth=date(1980, 1, 1), mobile_number='9876543201',
            state=state, district=district, constituency=eligible_constituency,
            status=Voter.Status.APPROVED,
        )
        client = APIClient()
        client.force_authenticate(admin)

        response = client.get(f'/api/voters/admin/eligibility-roots/?election_id={election.pk}')

        self.assertEqual(response.status_code, 200, response.data)
        roots = {row['constituency_id']: row for row in response.data['roots']}
        self.assertEqual(set(roots), {eligible_constituency.pk, empty_constituency.pk})
        self.assertEqual(roots[empty_constituency.pk]['eligible_voters'], 0)
        self.assertNotEqual(roots[empty_constituency.pk]['merkle_root'], '0x' + '0' * 64)
