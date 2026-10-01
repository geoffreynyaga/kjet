
import datetime
import os

from decouple import config

AWS_ACCESS_KEY_ID = config("S3_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = config("S3_SECRET_ACCESS_KEY")

AWS_FILE_EXPIRE = 200
AWS_PRELOAD_METADATA = True
AWS_QUERYSTRING_AUTH = config("AWS_QUERYSTRING_AUTH")
# S3Boto3Storage defaults to overwriting same-named keys instead of the unique
# suffix FileSystemStorage would generate; a versioned model whose files must
# never alias onto each other needs this off.
AWS_S3_FILE_OVERWRITE = False

# Django 5.1 removed DEFAULT_FILE_STORAGE and STATICFILES_STORAGE; they are
# ignored rather than raising, which silently drops both back to filesystem
# storage. STORAGES is the only form honoured now.
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {"location": "media"},
    },
    "staticfiles": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {"location": "static"},
    },
}

S3DIRECT_REGION = config("S3_REGION_NAME")
# AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_HOST = "eu-west-1"  # change to your region
AWS_S3_REGION_NAME = config("S3_REGION_NAME")
# S3_USE_SIGV4 = True
# os.environ['S3_USE_SIGV4'] = 'True'
os.environ.setdefault("S3_USE_SIGV4", "False")
# S3_USE_SIGV4 = True

AWS_STORAGE_BUCKET_NAME = config("S3_BUCKET_NAME")
S3_URL = "//%s.s3.amazonaws.com/" % AWS_STORAGE_BUCKET_NAME
MEDIA_URL = "//%s.s3.amazonaws.com/media/" % AWS_STORAGE_BUCKET_NAME

MEDIA_ROOT = MEDIA_URL
STATIC_URL = S3_URL + "static/"

ADMIN_MEDIA_PREFIX = STATIC_URL + "admin/"

two_months = datetime.timedelta(days=61)
date_two_months_later = datetime.date.today() + two_months
expires = date_two_months_later.strftime("%A, %d %B %Y 20:00:00 GMT")

AWS_HEADERS = {
    "Expires": expires,
    "Cache-Control": "max-age=%d" % (int(two_months.total_seconds()),),
}


# LARGE FILE UPLOAD SETTINGS
# AWS_UPLOAD_BUCKET = config("RASTER_S3_BUCKET")
# AWS_UPLOAD_USERNAME = config("AWS_UPLOAD_USERNAME")
# AWS_UPLOAD_GROUP = config("AWS_UPLOAD_GROUP")
# AWS_UPLOAD_REGION = config("RASTER_S3_REGION")
# AWS_UPLOAD_ACCESS_KEY_ID = config("RASTER_S3_ACCESS_KEY")
# AWS_UPLOAD_SECRET_KEY = config("RASTER_S3_SECRET_KEY")


AWS_DEFAULT_ACL = "public-read"
