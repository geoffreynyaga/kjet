from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User

class SignupLoginLogoutTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.signup_url = reverse('signup') if 'signup' in self._get_url_names() else '/accounts/signup/'
        self.login_url = reverse('login') if 'login' in self._get_url_names() else '/accounts/login/'
        self.logout_url = reverse('logout') if 'logout' in self._get_url_names() else '/accounts/logout/'

    def _get_url_names(self):
        from django.urls import get_resolver
        return [url.name for url in get_resolver().url_patterns if url.name]

    def test_signup_view_get(self):
        response = self.client.get(self.signup_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('form', response.context)

    def test_signup_view_post_invalid(self):
        response = self.client.post(self.signup_url, data={})
        self.assertEqual(response.status_code, 200)
        self.assertIn('form', response.context)
        self.assertTrue(response.context['form'].errors)

    def test_signup_view_post_valid(self):
        data = {'username': 'testuser', 'password1': 'testpass123', 'password2': 'testpass123'}
        response = self.client.post(self.signup_url, data)
        self.assertEqual(response.status_code, 302)
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_login_view_get(self):
        response = self.client.get(self.login_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('form', response.context)

    def test_login_view_post_invalid(self):
        response = self.client.post(self.login_url, data={'username': 'nouser', 'password': 'nopass'})
        self.assertEqual(response.status_code, 200)
        self.assertIn('form', response.context)
        self.assertTrue(response.context['form'].errors)

    def test_login_view_post_valid(self):
        User.objects.create_user(username='testuser', password='testpass123')
        response = self.client.post(self.login_url, data={'username': 'testuser', 'password': 'testpass123'})
        self.assertEqual(response.status_code, 302)

    def test_logout_view(self):
        user = User.objects.create_user(username='testuser', password='testpass123')
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(self.logout_url)
        self.assertEqual(response.status_code, 302)
