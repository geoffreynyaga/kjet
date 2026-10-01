import mimetypes
import re
from pathlib import Path
from urllib.parse import urlencode

from django.conf import settings
from django.core.files.base import ContentFile
from django.http import FileResponse, Http404
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline import csvtools, runner, sheets, tasks
from pipeline.models import Cohort, HumanResultsCsv, PipelineRun
from pipeline.serializers import (
    CohortSerializer,
    HumanResultsCsvSerializer,
    PipelineRunDetailSerializer,
    PipelineRunSerializer,
)


class BaselineCsvUnavailable(Exception):
    """The published version cannot supply a trustworthy CSV for diffing."""


def load_baseline_records(baseline):
    """Read a baseline from storage, with a checksum-verified repo fallback.

    Stored bytes are checked against the checksum recorded when the version was
    created. A storage backend that overwrites rather than uniquifies a repeated
    filename silently replaces an older version's object with a newer upload's
    content, which would make the review diff compare a file against itself.
    """
    if baseline.file:
        try:
            with baseline.file.open("rb") as handle:
                raw = handle.read()
            if csvtools.sha256(raw) == baseline.sha256:
                return csvtools.read_records(raw)
        except (FileNotFoundError, OSError, ValueError):
            pass

    repository_path = (
        Path(settings.BASE_DIR)
        / "scripts"
        / "human"
        / f"kjet-human-final-results-{baseline.cohort.slug}.csv"
    )
    if repository_path.is_file():
        raw = repository_path.read_bytes()
        if csvtools.sha256(raw) == baseline.sha256:
            return csvtools.read_records(raw)

    raise BaselineCsvUnavailable(
        f"Published baseline #{baseline.pk} has no stored CSV that matches its "
        "recorded checksum. Restore that baseline file before uploading a new "
        "version so the review diff remains trustworthy."
    )


def resolve_cohort(slug):
    """Look up a cohort by slug, falling back to the current one."""
    if slug:
        cohort = Cohort.objects.filter(slug=slug).first()
        if not cohort:
            raise ValueError(f"Unknown cohort '{slug}'.")
        return cohort

    cohort = Cohort.current()
    if not cohort:
        raise ValueError("No cohorts are configured.")
    return cohort


class StaffApiView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]


class AuthenticatedApiView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]


def _application_directories(cohort, application_id):
    if not re.fullmatch(r"[A-Za-z0-9_-]+", cohort or ""):
        return []

    match = re.fullmatch(r"Applicant_([A-Za-z0-9_-]+)", application_id or "", re.I)
    if not match:
        return []

    data_root = (Path(settings.BASE_DIR) / "data" / cohort).resolve()
    if not data_root.is_dir():
        return []

    folder_prefix = f"application_{match.group(1)}".casefold()
    application_directories = []
    for county_directory in sorted(data_root.iterdir()):
        if not county_directory.is_dir():
            continue
        for candidate in sorted(county_directory.iterdir()):
            candidate_name = candidate.name.casefold()
            if candidate.is_dir() and (
                candidate_name == folder_prefix
                or candidate_name.startswith(f"{folder_prefix}_")
            ):
                application_directories.append(candidate.resolve())
    return application_directories


class ApplicationDocumentListView(AuthenticatedApiView):
    def get(self, request, application_id):
        cohort = (request.query_params.get("cohort") or "latest").lower()
        data_root = (Path(settings.BASE_DIR) / "data" / cohort).resolve()
        files = []

        for application_directory in _application_directories(cohort, application_id):
            for file_path in sorted(application_directory.rglob("*")):
                if not file_path.is_file() or any(
                    part.startswith(".") for part in file_path.relative_to(application_directory).parts
                ):
                    continue

                display_name = file_path.relative_to(application_directory).as_posix()
                document_path = file_path.resolve().relative_to(data_root).as_posix()
                url = reverse(
                    "pipeline:application-document",
                    kwargs={
                        "application_id": application_id,
                        "document_path": document_path,
                    },
                )
                files.append(
                    {
                        "filename": display_name,
                        "absolute_path": "",
                        "s3_url": f"{url}?{urlencode({'cohort': cohort})}",
                    }
                )

        return Response({"files": files})


class ApplicationDocumentView(AuthenticatedApiView):
    def get(self, request, application_id, document_path):
        cohort = (request.query_params.get("cohort") or "latest").lower()
        data_root = (Path(settings.BASE_DIR) / "data" / cohort).resolve()
        target = (data_root / document_path).resolve()
        application_directories = _application_directories(cohort, application_id)

        if not target.is_file() or not any(
            target.is_relative_to(application_directory)
            for application_directory in application_directories
        ):
            raise Http404

        content_type, _ = mimetypes.guess_type(target.name)
        return FileResponse(
            target.open("rb"),
            content_type=content_type or "application/octet-stream",
            filename=target.name,
        )


class WhoAmIView(APIView):
    """Lets the dashboard decide whether to show the pipeline entry point.

    Authenticated rather than staff-only, so a non-staff user gets
    is_staff=false instead of a 403 the UI would have to special-case.
    """

    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {"username": request.user.get_username(), "is_staff": request.user.is_staff}
        )


def _load_csv_bytes(request):
    """Read the CSV from an uploaded file or a pasted Google Sheets URL."""
    upload = request.FILES.get("file")
    if upload:
        return upload.read(), HumanResultsCsv.Source.UPLOAD, "", upload.name

    sheet_url = (request.data.get("sheet_url") or "").strip()
    if sheet_url:
        body, resolved = sheets.fetch_csv(sheet_url)
        return body, HumanResultsCsv.Source.SHEET, resolved, "google-sheet.csv"

    raise ValueError("Provide either a CSV file or a Google Sheets URL.")


class SubmitCsvView(StaffApiView):
    """Validate a new CSV, diff it against the live version, and start a build.

    Structural changes are accepted when all load-bearing named columns remain
    available. Downstream readers do not depend on their positions.
    """

    def post(self, request):
        try:
            cohort = resolve_cohort(request.data.get("cohort"))
            raw, source, source_url, filename = _load_csv_bytes(request)
        except (ValueError, sheets.SheetFetchError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            records = csvtools.read_records(raw)
        except csvtools.CsvStructureError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        new_fingerprint = csvtools.fingerprint(records)
        summary = csvtools.summarise(records)
        digest = csvtools.sha256(raw)

        baseline = HumanResultsCsv.current(cohort)

        problems = csvtools.compare_fingerprints(
            baseline.fingerprint if baseline else {}, new_fingerprint
        )
        if problems:
            return Response(
                {
                    "detail": (
                        "The CSV is missing or duplicates columns required by the "
                        "human-results pipeline."
                    ),
                    "structure_problems": problems,
                },
                status=status.HTTP_409_CONFLICT,
            )

        if baseline:
            if baseline.sha256 == digest:
                return Response(
                    {
                        "detail": "This file is identical to the published version. "
                        "Nothing to do.",
                        "identical": True,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        diff = {}
        if baseline:
            try:
                old_records = load_baseline_records(baseline)
            except BaselineCsvUnavailable as exc:
                return Response(
                    {"detail": str(exc)}, status=status.HTTP_409_CONFLICT
                )
            diff = csvtools.diff_rows(old_records, records)

        version = HumanResultsCsv.objects.create(
            cohort=cohort,
            source=source,
            source_url=source_url,
            original_filename=filename,
            sha256=digest,
            status=HumanResultsCsv.Status.VALIDATED,
            row_count=summary["row_count"],
            fingerprint=new_fingerprint,
            uploaded_by=request.user,
        )
        # Content-addressed so every distinct upload claims its own key. A
        # constant name is overwritten in place by storage backends that do not
        # uniquify (S3Boto3Storage with its default file_overwrite=True), which
        # would replace an already-published version's bytes with a later upload.
        version.file.save(
            f"kjet-human-final-results-{cohort.slug}-{digest[:12]}.csv",
            ContentFile(raw),
            save=True,
        )

        run = PipelineRun.objects.create(
            csv=version,
            baseline=baseline,
            diff=diff,
            started_by=request.user,
        )
        async_result = tasks.build_run.delay(run.pk)
        run.celery_task_id = async_result.id
        run.save(update_fields=["celery_task_id"])

        return Response(
            PipelineRunDetailSerializer(run).data, status=status.HTTP_201_CREATED
        )


class RunDetailView(StaffApiView):
    """Polled by the UI while a build is in flight."""

    def get(self, request, pk):
        try:
            run = PipelineRun.objects.select_related("csv").get(pk=pk)
        except PipelineRun.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(PipelineRunDetailSerializer(run).data)


class RunPublishView(StaffApiView):
    """Approve a built run and upload its changed outputs."""

    def post(self, request, pk):
        try:
            run = PipelineRun.objects.select_related("csv").get(pk=pk)
        except PipelineRun.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if run.status != PipelineRun.Status.BUILT:
            return Response(
                {"detail": f"Run is {run.status}; only a built run can be published."},
                status=status.HTTP_409_CONFLICT,
            )

        # Runs build concurrently but publish one at a time: refuse a run whose
        # baseline is no longer the live version.
        current = HumanResultsCsv.current(run.csv.cohort)
        if current and current.pk != (run.baseline_id or current.pk):
            return Response(
                {
                    "detail": (
                        "Another version was published while this run was under "
                        "review. Re-upload so the diff reflects what is live."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        if not run.changed_outputs:
            return Response(
                {"detail": "This run produced no output changes; nothing to publish."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Move out of BUILT before dispatching so the response can never report a
        # still-publishable run, which would leave the publish button live and
        # invite a second click.
        run.status = PipelineRun.Status.PUBLISHING
        run.save(update_fields=["status"])

        async_result = tasks.publish_run.delay(run.pk)
        run.celery_task_id = async_result.id
        run.save(update_fields=["celery_task_id"])

        run.refresh_from_db()
        return Response(PipelineRunSerializer(run).data, status=status.HTTP_202_ACCEPTED)


class RunDiscardView(StaffApiView):
    """Reject a built run and drop its sandbox."""

    def post(self, request, pk):
        try:
            run = PipelineRun.objects.get(pk=pk)
        except PipelineRun.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        runner.discard_sandbox(run.sandbox_path)
        run.status = PipelineRun.Status.DISCARDED
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "finished_at"])

        if run.csv.status == HumanResultsCsv.Status.VALIDATED:
            run.csv.status = HumanResultsCsv.Status.REJECTED
            run.csv.save(update_fields=["status"])

        return Response(PipelineRunSerializer(run).data)


class VersionListView(StaffApiView):
    """Version history, newest first."""

    def get(self, request):
        try:
            cohort = resolve_cohort(request.query_params.get("cohort"))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        versions = HumanResultsCsv.objects.filter(cohort=cohort)[:50]
        return Response(HumanResultsCsvSerializer(versions, many=True).data)


class CohortListView(StaffApiView):
    """Cohorts available for upload; the current one is pre-selected."""

    def get(self, request):
        return Response(CohortSerializer(Cohort.objects.all(), many=True).data)


class VersionRerunView(StaffApiView):
    """Rollback: rebuild from a stored version and publish it after review."""

    def post(self, request, pk):
        try:
            version = HumanResultsCsv.objects.get(pk=pk)
        except HumanResultsCsv.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        baseline = HumanResultsCsv.current(version.cohort)
        diff = {}
        if baseline and baseline.pk != version.pk:
            try:
                old_records = load_baseline_records(baseline)
            except BaselineCsvUnavailable as exc:
                return Response(
                    {"detail": str(exc)}, status=status.HTTP_409_CONFLICT
                )
            with version.file.open("rb") as handle:
                new_records = csvtools.read_records(handle.read())
            diff = csvtools.diff_rows(old_records, new_records)

        run = PipelineRun.objects.create(
            csv=version,
            baseline=baseline,
            diff=diff,
            started_by=request.user,
        )
        async_result = tasks.build_run.delay(run.pk)
        run.celery_task_id = async_result.id
        run.save(update_fields=["celery_task_id"])

        return Response(
            PipelineRunDetailSerializer(run).data, status=status.HTTP_201_CREATED
        )
