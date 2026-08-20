from django.conf import settings
from django.db import models


class Cohort(models.Model):
    """An application cohort.

    The slug is not cosmetic: it names the data directories the pipeline reads
    and writes (ui/public/<slug>, scripts/human/kjet-human-final-results-<slug>.csv)
    and is passed straight to make as COHORT=<slug>.
    """

    slug = models.SlugField(max_length=32, unique=True)
    label = models.CharField(max_length=64)
    is_current = models.BooleanField(
        default=False, help_text="Pre-selected when uploading a new CSV."
    )

    class Meta:
        ordering = ["-is_current", "slug"]

    def __str__(self):
        return self.label or self.slug

    @classmethod
    def current(cls):
        return cls.objects.filter(is_current=True).first() or cls.objects.first()


class HumanResultsCsv(models.Model):
    """One uploaded or fetched version of the human results CSV.

    Rows are append-only: a new upload never overwrites an earlier one, so any
    previous version can be re-run and re-published.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        VALIDATED = "VALIDATED", "Validated"
        PUBLISHED = "PUBLISHED", "Published"
        SUPERSEDED = "SUPERSEDED", "Superseded"
        REJECTED = "REJECTED", "Rejected"

    class Source(models.TextChoices):
        UPLOAD = "UPLOAD", "Uploaded file"
        SHEET = "SHEET", "Google Sheet"
        SEED = "SEED", "Seeded from repository"

    cohort = models.ForeignKey(
        Cohort, on_delete=models.PROTECT, related_name="csv_versions"
    )
    file = models.FileField(upload_to="human-csv/%Y/%m/")
    original_filename = models.CharField(max_length=255, blank=True)
    source = models.CharField(max_length=16, choices=Source.choices)
    source_url = models.TextField(blank=True)
    # Hex SHA-256 of the file, used to spot a re-upload of an identical CSV.
    sha256 = models.CharField(max_length=64)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.DRAFT
    )
    # Shown in the version history; not used for validation.
    row_count = models.PositiveIntegerField(default=0)
    # Structural fingerprint: discovered header record, leaf names in order,
    # column count, and diagnostic physical-line/header-position metadata.
    fingerprint = models.JSONField(default=dict, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "human results CSV"
        verbose_name_plural = "human results CSVs"

    def __str__(self):
        return f"{self.cohort} #{self.pk} ({self.status})"

    @classmethod
    def current(cls, cohort):
        """The version live for this cohort, or None before its first publish.

        Scoped by cohort so a version can only ever be compared against, and
        superseded by, another version of the same cohort.
        """
        return (
            cls.objects.filter(cohort=cohort, status=cls.Status.PUBLISHED)
            .order_by("-published_at", "-created_at")
            .first()
        )


class PipelineRun(models.Model):
    """A single build of the dashboard outputs from one CSV version."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        RUNNING = "RUNNING", "Running"
        BUILT = "BUILT", "Built, awaiting publish"
        PUBLISHING = "PUBLISHING", "Publishing"
        PUBLISHED = "PUBLISHED", "Published"
        FAILED = "FAILED", "Failed"
        DISCARDED = "DISCARDED", "Discarded"

    csv = models.ForeignKey(
        HumanResultsCsv, on_delete=models.CASCADE, related_name="runs"
    )
    # The published version this run was diffed against. Publishing is refused if
    # a different version has become current in the meantime.
    baseline = models.ForeignKey(
        HumanResultsCsv,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="runs_as_baseline",
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING
    )
    current_step = models.CharField(max_length=128, blank=True)
    steps_done = models.PositiveIntegerField(default=0)
    steps_total = models.PositiveIntegerField(default=0)
    log = models.TextField(blank=True)
    error = models.TextField(blank=True)
    diff = models.JSONField(default=dict, blank=True)
    sandbox_path = models.CharField(max_length=512, blank=True)
    published_keys = models.JSONField(default=list, blank=True)
    changed_outputs = models.JSONField(default=list, blank=True)
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    celery_task_id = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Run #{self.pk} for CSV #{self.csv_id} ({self.status})"

    def append_log(self, text):
        if not text:
            return
        self.log = f"{self.log}{text.rstrip()}\n"

    def set_step(self, name, done, total):
        self.current_step = name
        self.steps_done = done
        self.steps_total = total
        self.save(update_fields=["current_step", "steps_done", "steps_total", "log"])
