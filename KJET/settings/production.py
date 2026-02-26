import os

from decouple import Csv, config

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


DEBUG = config("DEBUG", default=False, cast=bool)

TIME_ZONE = "UTC"
USE_TZ = True


# CORS_URLS_REGEX = r"^/api.*"
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=Csv())
CORS_ORIGIN_ALLOW_ALL = True


CELERY_TIMEZONE = "UTC"

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": config("DATABASE_NAME"),
        "USER": config("DATABASE_USER"),
        "PASSWORD": config("DATABASE_PASSWORD"),
        "HOST": config("DATABASE_HOST"),
        "PORT": "5432",
    }
}


# CORS_REPLACE_HTTPS_REFERER = True
# HOST_SCHEME = "https://"
# SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_SECONDS = 1000000
# SECURE_HSTS_PRELOAD = True
# SECURE_FRAME_DENY = True


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "console": {"format": "%(name)-12s %(levelname)-8s %(message)s"},
        "file": {"format": "%(asctime)s %(name)-12s %(levelname)-8s %(message)s"},
    },
    "handlers": {
        "console": {"level": "DEBUG", "class": "logging.StreamHandler"},
        "logfile": {
            "level": "DEBUG",
            # "class": "logging.FileHandler",
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "file",
            "filename": os.path.join(BASE_DIR, "logs/logfile.log"),
            "backupCount": 10,  # keep at most 10 log files
            "maxBytes": 5242880,  # 5*1024*1024 bytes (5MB)
        },
    },
    "root": {"level": "INFO", "handlers": ["console", "logfile"]},
    "loggers": {"": {"level": "DEBUG", "handlers": ["console", "logfile"]}},
}

# AWS settings
from KJET.aws.conf import *

IS_PROD = True
AWS_QUERYSTRING_AUTH = False
