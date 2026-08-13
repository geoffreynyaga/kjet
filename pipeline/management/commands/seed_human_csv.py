from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from pipeline import csvtools
from pipeline.models import Cohort, HumanResultsCsv


class Command(BaseCommand):
    help = (
        "Record the repository's current human results CSV as the published "
        "version, so the first upload has a fingerprint to compare against."
    )

    def add_arguments(self, parser):
        parser.add_argument("--cohort", default="latest")
        parser.add_argument(
            "--path",
            help="CSV to seed from (defaults to scripts/human/kjet-human-final-results-<cohort>.csv)",
        )

    def handle(self, *args, **options):
        from django.conf import settings

        slug = options["cohort"]
        cohort = Cohort.objects.filter(slug=slug).first()
        if not cohort:
            raise CommandError(
                f"No cohort with slug '{slug}'. Known: "
                f"{', '.join(Cohort.objects.values_list('slug', flat=True)) or 'none'}."
            )

        path = Path(
            options["path"]
            or Path(settings.BASE_DIR)
            / "scripts"
            / "human"
            / f"kjet-human-final-results-{slug}.csv"
        )

        if not path.exists():
            raise CommandError(f"CSV not found: {path}")

        existing = HumanResultsCsv.current(cohort)
        if existing:
            raise CommandError(
                f"Cohort '{slug}' already has a published version (#{existing.pk}). "
                f"Nothing to seed."
            )

        raw = path.read_bytes()
        records = csvtools.read_records(raw)
        summary = csvtools.summarise(records)

        version = HumanResultsCsv.objects.create(
            cohort=cohort,
            source=HumanResultsCsv.Source.SEED,
            original_filename=path.name,
            sha256=csvtools.sha256(raw),
            status=HumanResultsCsv.Status.PUBLISHED,
            row_count=summary["row_count"],
            fingerprint=csvtools.fingerprint(records),
            published_at=timezone.now(),
        )
        version.file.save(path.name, ContentFile(raw), save=True)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded version #{version.pk} for cohort '{slug}': "
                f"{summary['row_count']} rows, {summary['column_count']} columns."
            )
        )
