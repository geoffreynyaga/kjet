from django.core.files.base import ContentFile
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline import csvtools, runner, sheets, tasks
from pipeline.models import HumanResultsCsv, PipelineRun
from pipeline.serializers import (
    HumanResultsCsvSerializer,
    PipelineRunDetailSerializer,
    PipelineRunSerializer,
)

DEFAULT_COHORT = "latest"


class StaffApiView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]


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

    A structural change is refused outright: scores are read positionally
    downstream, so a shifted column produces wrong numbers with no error.
    """

    def post(self, request):
        cohort = request.data.get("cohort") or DEFAULT_COHORT

        try:
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

        if baseline:
            problems = csvtools.compare_fingerprints(
                baseline.fingerprint, new_fingerprint
            )
            if problems:
                return Response(
                    {
                        "detail": (
                            "The CSV structure differs from the published version. "
                            "Scores are read by column position downstream, so this "
                            "run is blocked."
                        ),
                        "structure_problems": problems,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            if baseline.sha256 == digest:
                return Response(
                    {
                        "detail": "This file is identical to the published version. "
                        "Nothing to do.",
                        "identical": True,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

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
        version.file.save(
            f"kjet-human-final-results-{cohort}.csv", ContentFile(raw), save=True
        )

        diff = {}
        if baseline:
            with baseline.file.open("rb") as handle:
                old_records = csvtools.read_records(handle.read())
            diff = csvtools.diff_rows(old_records, records)

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

        async_result = tasks.publish_run.delay(run.pk)
        run.celery_task_id = async_result.id
        run.save(update_fields=["celery_task_id"])
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
        cohort = request.query_params.get("cohort") or DEFAULT_COHORT
        versions = HumanResultsCsv.objects.filter(cohort=cohort)[:50]
        return Response(HumanResultsCsvSerializer(versions, many=True).data)


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
            with baseline.file.open("rb") as handle:
                old_records = csvtools.read_records(handle.read())
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
