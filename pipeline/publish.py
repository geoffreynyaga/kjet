"""Publishes built outputs to the static storage the dashboard reads from.

The frontend fetches `<S3 endpoint>/static/data/<cohort>/<file>.json` (see
ui/src/utils.ts:buildStaticDataUrl), and STATICFILES_STORAGE points at
S3Boto3Storage(location="static"), so saving under `data/<cohort>/` lands on the
right key. Only the files a run actually changed are uploaded.
"""

import shutil
from pathlib import Path

from django.contrib.staticfiles.storage import staticfiles_storage
from django.core.files.base import ContentFile

from pipeline.runner import repo_output_dir


def storage_key(cohort, name):
    return f"data/{cohort}/{name}"


def publish_files(sandbox, cohort, names):
    """Upload the named built files, overwriting any existing object.

    Returns the storage keys written. Deleting first keeps behaviour identical
    on filesystem storage, which would otherwise suffix the name instead of
    overwriting.
    """
    built_dir = Path(sandbox) / "ui" / "public" / cohort
    written = []

    for name in names:
        source = built_dir / name
        if not source.exists():
            continue
        key = storage_key(cohort, name)
        if staticfiles_storage.exists(key):
            staticfiles_storage.delete(key)
        staticfiles_storage.save(key, ContentFile(source.read_bytes()))
        written.append(key)

    return written


def sync_to_repo(sandbox, cohort, names):
    """Mirror published files into the repository's ui/public tree.

    The next run seeds its sandbox from this directory, so it has to reflect
    what is live -- otherwise a later run would rebuild against stale inputs and
    report already-published files as changed.
    """
    built_dir = Path(sandbox) / "ui" / "public" / cohort
    target_dir = repo_output_dir(cohort)
    target_dir.mkdir(parents=True, exist_ok=True)

    for name in names:
        source = built_dir / name
        if source.exists():
            shutil.copy2(source, target_dir / name)
