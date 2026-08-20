from .base import *


# Keep tests isolated from development and production Postgres databases.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
