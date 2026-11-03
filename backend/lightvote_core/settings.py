import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

# Load .env file from root or backend
load_dotenv(ROOT_DIR / '.env')
load_dotenv(BASE_DIR / '.env')

DEBUG = os.getenv('DJANGO_DEBUG', 'False').lower() in ('true', '1', 't')
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError('DJANGO_SECRET_KEY must be configured when DEBUG is disabled.')
    SECRET_KEY = 'dev-only-lightvote-key-change-before-deployment'
if not DEBUG and (len(SECRET_KEY) < 32 or 'replace-with' in SECRET_KEY.lower() or SECRET_KEY.startswith('dev-only-')):
    raise RuntimeError('DJANGO_SECRET_KEY must be a private random value of at least 32 characters in production.')

ALLOWED_HOSTS = [host.strip() for host in os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if host.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'corsheaders',

    # LightVote Apps
    'apps.authentication',
    'apps.elections',
    'apps.voters',
    'apps.parties_candidates',
    'apps.receipts',
    'apps.explorer',
    'apps.research',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'lightvote_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'lightvote_core.wsgi.application'

# Database: PostgreSQL if DATABASE_URL is set (production), otherwise SQLite
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    try:
        import dj_database_url
        DATABASES = {
            'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
        }
    except ImportError:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': os.getenv('SQLITE_PATH', str(BASE_DIR / 'db.sqlite3')),
            }
        }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.getenv('SQLITE_PATH', str(BASE_DIR / 'db.sqlite3')),
        }
    }

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.auth.CsrfProtectedSessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.getenv('API_PAGE_SIZE', '50')),
    'PAGE_SIZE_QUERY_PARAM': 'page_size',
    'MAX_PAGE_SIZE': 200,
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173'
).split(',') if origin.strip()]
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# CSRF Trusted Origins for Vite Dev Server & Local Clients
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173'
).split(',') if origin.strip()]

# Cross-origin cookie settings — required for Vercel (frontend) + Render (backend) on HTTPS
SESSION_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'
CSRF_COOKIE_SECURE = not DEBUG
CSRF_FAILURE_VIEW = 'apps.authentication.auth.csrf_failure'

# Email OTP Configuration
EMAIL_BACKEND_TYPE = os.getenv('EMAIL_BACKEND_TYPE', 'console')
if EMAIL_BACKEND_TYPE == 'smtp':
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1')
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
    EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', 10))
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'LightVote Election Commission <noreply@lightvote.org>')

# Web3 / Blockchain RPC
HARDHAT_RPC_URL = os.getenv('HARDHAT_RPC_URL', 'http://127.0.0.1:8545' if DEBUG else '')
CHAIN_ID_VALUE = os.getenv('CHAIN_ID')
if not DEBUG and not HARDHAT_RPC_URL:
    raise RuntimeError('HARDHAT_RPC_URL must be configured for the production blockchain.')
if not DEBUG and not CHAIN_ID_VALUE:
    raise RuntimeError('CHAIN_ID must explicitly match the production contract deployment.')
CHAIN_ID = int(CHAIN_ID_VALUE or 31337)
BALLOT_NULLIFIER_SECRET = os.getenv('BALLOT_NULLIFIER_SECRET', SECRET_KEY if DEBUG else '')
if not DEBUG and (
    len(BALLOT_NULLIFIER_SECRET) < 32 or
    'replace-with' in BALLOT_NULLIFIER_SECRET.lower() or
    BALLOT_NULLIFIER_SECRET == SECRET_KEY
):
    raise RuntimeError('BALLOT_NULLIFIER_SECRET must be a separate private random value of at least 32 characters in production.')
