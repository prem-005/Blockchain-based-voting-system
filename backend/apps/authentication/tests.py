from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.elections.models import District, State
from apps.authentication.models import OTPToken


User = get_user_model()


class AdminAccountManagementTests(TestCase):
    def setUp(self):
        state = State.objects.create(name='Tamil Nadu', code='TN')
        self.district = District.objects.create(id=29, name='Tiruchirappalli', code='TN-TRY', state=state)
        self.central_admin = User.objects.create_user(email='central@example.test', role=User.Role.CENTRAL_ADMIN)
        self.client = APIClient()
        self.client.force_authenticate(self.central_admin)

    def test_central_admin_can_provision_district_admin(self):
        response = self.client.post('/api/auth/admins/', {
            'email': 'dro@example.test',
            'role': User.Role.DISTRICT_ADMIN,
            'assigned_district_id': self.district.id,
        }, format='json')

        self.assertEqual(response.status_code, 201)
        account = User.objects.get(email='dro@example.test')
        self.assertEqual(account.role, User.Role.DISTRICT_ADMIN)
        self.assertEqual(account.assigned_district_id, self.district.id)
        self.assertFalse(account.is_verified)
        self.assertFalse(account.has_usable_password())

    def test_district_admin_must_have_an_existing_district(self):
        response = self.client.post('/api/auth/admins/', {
            'email': 'dro@example.test',
            'role': User.Role.DISTRICT_ADMIN,
            'assigned_district_id': 999,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='dro@example.test').exists())

    def test_central_admin_can_deactivate_and_reactivate_a_district_admin(self):
        dro = User.objects.create_user(
            email='dro@example.test', role=User.Role.DISTRICT_ADMIN,
            assigned_district_id=self.district.id,
        )

        deactivate = self.client.patch(f'/api/auth/admins/{dro.id}/', {'is_active': False}, format='json')
        self.assertEqual(deactivate.status_code, 200)
        dro.refresh_from_db()
        self.assertFalse(dro.is_active)

        reactivate = self.client.patch(f'/api/auth/admins/{dro.id}/', {'is_active': True}, format='json')
        self.assertEqual(reactivate.status_code, 200)
        dro.refresh_from_db()
        self.assertTrue(dro.is_active)


class CsrfProtectionTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def test_login_post_requires_csrf_token(self):
        response = self.client.post('/api/auth/login/', {}, format='json')

        self.assertEqual(response.status_code, 403)

    def test_csrf_bootstrap_returns_spa_readable_token(self):
        bootstrap = self.client.get('/api/auth/csrf/')
        self.assertEqual(bootstrap.status_code, 200)
        self.assertTrue(bootstrap.data.get('csrf_token'))
        self.assertIn('csrftoken', self.client.cookies)

        response = self.client.post(
            '/api/auth/login/', {}, format='json',
            HTTP_X_CSRFTOKEN=bootstrap.data['csrf_token'],
        )
        self.assertEqual(response.status_code, 400)


class AuthenticationFlowTests(TestCase):
    def test_invalid_password_login_is_rejected(self):
        User.objects.create_user(email='admin@example.test', password='CorrectPassword123')

        response = APIClient().post('/api/auth/login/', {
            'email': 'admin@example.test',
            'password': 'incorrect-password',
        }, format='json')

        self.assertEqual(response.status_code, 401)

    def test_otp_verification_activates_email_verified_session(self):
        user = User.objects.create_user(email='voter@example.test')
        token = OTPToken.generate_otp(user, purpose='LOGIN')
        client = APIClient()

        response = client.post('/api/auth/verify-otp/', {
            'email': user.email,
            'otp_code': token.otp_code,
            'purpose': 'LOGIN',
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        user.refresh_from_db()
        self.assertTrue(user.is_verified)
        self.assertTrue(OTPToken.objects.get(pk=token.pk).is_used)
        self.assertTrue(client.get('/api/auth/me/').data['authenticated'])

    def test_voter_cannot_access_central_admin_accounts(self):
        voter = User.objects.create_user(email='voter@example.test', role=User.Role.VOTER)
        client = APIClient()
        client.force_authenticate(voter)

        response = client.get('/api/auth/admins/')

        self.assertEqual(response.status_code, 403)
