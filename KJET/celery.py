import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "KJET.settings")

app = Celery("KJET")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
