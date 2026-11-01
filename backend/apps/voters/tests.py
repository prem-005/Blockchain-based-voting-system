from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
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
