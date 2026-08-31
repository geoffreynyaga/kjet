import csv
import io
import json
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings

from pipeline import csvtools
from pipeline.models import Cohort, HumanResultsCsv, PipelineRun
from scripts.compare_old_and_new.extract_comparison_data import (
    extract_comparison_data,
)
from scripts.human.baseline import extract_applicants_data, standardize_county_names
from scripts.human.convert import extract_csv_to_json


def human_header(include_equity=True):
    header = [
        "Link to application bundle",
        "Application ID",
        "",
        "E2. County Mapping",
        "E3. Priority Value Chain",
        "IF OTHER PVC Which one?",
        "E4. Minimum Financial Evidence",
        "E5. Consent & Contactability",
        "REASON(Evaluators Comments)",
        "A3.1 Registration & Track Record",
        "Logic",
        "A3.2 Financial Position",
        "Logic",
        "A3.3 Market Demand & Competitiveness",
        "Logic",
        "A3.4 Business Proposal / Growth Viability",
        "Logic",
        "A3.5 Value Chain Alignment & Role",
        "Logic",
        "A3.6 Inclusivity & Sustainability",
        "Logic",
        "Disqualifiers & Penalties",
        "TIERS",
        "A3.1",
        "A3.2",
        "A3.3",
        "A3.4",
        "A3.5",
        "A3.6",
        "A3.1",
        "A3.2",
        "A3.3",
        "A3.4",
        "A3.5",
        "A3.6",
        "TOTAL",
    ]
    if include_equity:
        header.append("Equity Points")
    header.extend(
        [
            "Penalty Points",
            "Sum of weighted scores - Penalty(if any)",
            "Ranking from composite score",
            "",
        ]
    )
    return header


def human_row(header, *, equity="5", score="79", rank="2"):
    values = {
        "Link to application bundle": "application_EXAMPLE_bundle.zip",
        "Application ID": "Applicant_EXAMPLE",
        "E2. County Mapping": "NAIROBI",
        "E3. Priority Value Chain": "Dairy",
        "REASON(Evaluators Comments)": "All requirements met",
        "A3.1 Registration & Track Record": "4",
        "A3.2 Financial Position": "4",
        "A3.3 Market Demand & Competitiveness": "4",
        "A3.4 Business Proposal / Growth Viability": "4",
        "A3.5 Value Chain Alignment & Role": "4",
        "A3.6 Inclusivity & Sustainability": "4",
        "TOTAL": "84",
        "Equity Points": equity,
        "Penalty Points": "5",
        "Sum of weighted scores - Penalty(if any)": score,
        "Ranking from composite score": rank,
    }
    row = []
    seen = {}
    for column in header:
        seen[column] = seen.get(column, 0) + 1
        row.append(values.get(column, "") if seen[column] == 1 else "")
    return row


def csv_bytes(*, include_banner=False, include_equity=True, equity="5"):
    header = human_header(include_equity=include_equity)
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    if include_banner:
        writer.writerow(["Applicant Details", ""] + [""] * (len(header) - 2))
    writer.writerow(header)
    writer.writerow(human_row(header, equity=equity if include_equity else ""))
    return output.getvalue().encode()


class CsvToolsTests(SimpleTestCase):
    def test_detects_banner_prefixed_and_header_first_layouts(self):
        old_records = csvtools.read_records(
            csv_bytes(include_banner=True, include_equity=False)
        )
        new_records = csvtools.read_records(csv_bytes(include_equity=True))

        self.assertEqual(csvtools.fingerprint(old_records)["header_record_index"], 1)
        self.assertEqual(csvtools.fingerprint(new_records)["header_record_index"], 0)
        self.assertEqual(csvtools.summarise(new_records)["column_count"], 41)
        self.assertEqual(
            csvtools.compare_fingerprints(
                csvtools.fingerprint(old_records), csvtools.fingerprint(new_records)
            ),
            [],
        )

    def test_diff_matches_columns_by_name_after_equity_is_inserted(self):
        old_records = csvtools.read_records(
            csv_bytes(include_banner=True, include_equity=False)
        )
        new_records = csvtools.read_records(csv_bytes(include_equity=True))

        diff = csvtools.diff_rows(old_records, new_records)

        self.assertEqual(diff["totals"]["changed"], 1)
        self.assertEqual(diff["totals"]["scored_cells_changed"], 1)
        self.assertEqual(
            [cell["column"] for cell in diff["changed"][0]["cells"]],
            ["Equity Points"],
        )

    def test_validation_reports_a_missing_required_column(self):
        records = csvtools.read_records(csv_bytes())
        fingerprint = csvtools.fingerprint(records)
        fingerprint["header"].remove("TOTAL")

        problems = csvtools.compare_fingerprints({}, fingerprint)

        self.assertEqual(problems[0]["kind"], "missing_column")
        self.assertEqual(problems[0]["old"], "TOTAL")


class HumanScriptTests(SimpleTestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.csv_path = Path(self.tempdir.name) / "kjet-human-final-results-latest.csv"
        self.csv_path.write_bytes(csv_bytes())

    def test_convert_keeps_equity_and_the_first_applicant(self):
        output = Path(self.tempdir.name) / "out" / "human.json"

        extract_csv_to_json(str(self.csv_path), str(output))

        records = json.loads(output.read_text())
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["Application ID"], "Applicant_EXAMPLE")
        self.assertEqual(records[0]["Equity Points"], 5)

    def test_baseline_resolves_summary_columns_by_name(self):
        records = extract_applicants_data(str(self.csv_path))

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["weighted_score"], 79.0)
        self.assertEqual(records[0]["ranking"], 2)
        self.assertEqual(records[0]["equity_points"], 5.0)
        self.assertEqual(records[0]["penalty_points"], 5.0)

    def test_county_aliases_in_the_new_export_are_standardized(self):
        records = [
            {"application_id": "Applicant_1", "county": "ELGEIYO MARAKWET"},
            {"application_id": "Applicant_2", "county": "HOMABAY"},
        ]

        standardize_county_names(records)

        self.assertEqual(
            [record["county"] for record in records],
            ["Elgeyo Marakwet", "Homa Bay"],
        )

    def test_comparison_export_keeps_equity_and_named_a3_scores(self):
        workspace = Path(self.tempdir.name) / "workspace"
        input_dir = workspace / "scripts" / "human"
        input_dir.mkdir(parents=True)
        (input_dir / "kjet-human-final-results-latest.csv").write_bytes(csv_bytes())

        records = extract_comparison_data("latest", workspace)

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["Human Score"], 79.0)
        self.assertEqual(records[0]["Equity Points"], 5.0)
        self.assertEqual(records[0]["A3.1 Registration & Track Record "], 4.0)


class OverwritingStorage(FileSystemStorage):
    """Stands in for S3Boto3Storage's default file_overwrite=True behaviour.

    FileSystemStorage uniquifies a repeated name, which is why a constant upload
    filename misbehaves only in production. This backend keeps the name it is
    given, so a collision overwrites in place the way the S3 backend does.
    """

    def get_available_name(self, name, max_length=None):
        if self.exists(name):
            self.delete(name)
        return name


class SubmitCsvTests(TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.tempdir.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        # Migration 0002 already seeds this cohort; do not recreate it.
        self.cohort, _ = Cohort.objects.get_or_create(
            slug="latest", defaults={"label": "Latest", "is_current": True}
        )
        self.user = get_user_model().objects.create_user(
            username="staff", password="password", is_staff=True
        )
        self.client.force_login(self.user)

    @mock.patch("pipeline.views.tasks.build_run.delay")
    def test_header_first_csv_with_equity_starts_a_run(self, delay):
        delay.return_value = SimpleNamespace(id="task-1")
        upload = SimpleUploadedFile(
            "kjet-human-final-results-latest.csv", csv_bytes(), content_type="text/csv"
        )

        response = self.client.post(
            "/api/pipeline/submit/", {"cohort": "latest", "file": upload}
        )

        self.assertEqual(response.status_code, 201, response.content)
        version = HumanResultsCsv.objects.get()
        self.assertEqual(version.row_count, 1)
        self.assertEqual(version.fingerprint["header_record_index"], 0)
        delay.assert_called_once()

    @mock.patch("pipeline.views.tasks.build_run.delay")
    def test_new_layout_is_accepted_against_a_published_old_layout(self, delay):
        delay.return_value = SimpleNamespace(id="task-2")
        old_raw = csv_bytes(include_banner=True, include_equity=False)
        old_records = csvtools.read_records(old_raw)
        baseline = HumanResultsCsv.objects.create(
            cohort=self.cohort,
            source=HumanResultsCsv.Source.SEED,
            sha256=csvtools.sha256(old_raw),
            status=HumanResultsCsv.Status.PUBLISHED,
            row_count=1,
            fingerprint=csvtools.fingerprint(old_records),
        )
        baseline.file.save(
            "kjet-human-final-results-latest.csv", ContentFile(old_raw), save=True
        )
        upload = SimpleUploadedFile(
            "kjet-human-final-results-latest.csv", csv_bytes(), content_type="text/csv"
        )

        response = self.client.post(
            "/api/pipeline/submit/", {"cohort": "latest", "file": upload}
        )

        self.assertEqual(response.status_code, 201, response.content)
        run = PipelineRun.objects.get(pk=response.json()["id"])
        self.assertEqual(run.diff["totals"]["scored_cells_changed"], 1)
        self.assertEqual(
            run.diff["changed"][0]["cells"][0]["column"], "Equity Points"
        )

    @mock.patch("pipeline.views.tasks.build_run.delay")
    def test_missing_published_baseline_file_returns_a_conflict(self, delay):
        HumanResultsCsv.objects.create(
            cohort=self.cohort,
            source=HumanResultsCsv.Source.SEED,
            sha256="0" * 64,
            status=HumanResultsCsv.Status.PUBLISHED,
            row_count=1,
            fingerprint=csvtools.fingerprint(csvtools.read_records(csv_bytes())),
        )
        upload = SimpleUploadedFile(
            "kjet-human-final-results-latest.csv", csv_bytes(), content_type="text/csv"
        )

        response = self.client.post(
            "/api/pipeline/submit/", {"cohort": "latest", "file": upload}
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("has no stored CSV", response.json()["detail"])
        delay.assert_not_called()

    @mock.patch("pipeline.views.tasks.build_run.delay")
    def test_baseline_whose_stored_bytes_were_overwritten_returns_a_conflict(
        self, delay
    ):
        # A storage backend that overwrites a repeated filename replaces an
        # already-published version's object with a later upload. Diffing against
        # it would compare the new file to itself and report no changes.
        published_raw = csv_bytes(include_equity=False)
        baseline = HumanResultsCsv.objects.create(
            cohort=self.cohort,
            source=HumanResultsCsv.Source.SEED,
            sha256=csvtools.sha256(published_raw),
            status=HumanResultsCsv.Status.PUBLISHED,
            row_count=1,
            fingerprint=csvtools.fingerprint(csvtools.read_records(published_raw)),
        )
        baseline.file.save(
            "kjet-human-final-results-latest.csv",
            ContentFile(csv_bytes(equity="9")),
            save=True,
        )

        upload = SimpleUploadedFile(
            "kjet-human-final-results-latest.csv",
            csv_bytes(equity="9"),
            content_type="text/csv",
        )
        response = self.client.post(
            "/api/pipeline/submit/", {"cohort": "latest", "file": upload}
        )

        self.assertEqual(response.status_code, 409, response.content)
        self.assertIn("recorded checksum", response.json()["detail"])
        delay.assert_not_called()

    @override_settings(
        STORAGES={
            "default": {"BACKEND": "pipeline.tests.OverwritingStorage"},
            "staticfiles": {
                "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
            },
        }
    )
    @mock.patch("pipeline.views.tasks.build_run.delay")
    def test_each_distinct_upload_claims_its_own_storage_key(self, delay):
        delay.return_value = SimpleNamespace(id="task-3")

        first = csv_bytes(equity="5")
        second = csv_bytes(equity="9")
        for raw in (first, second):
            response = self.client.post(
                "/api/pipeline/submit/",
                {
                    "cohort": "latest",
                    "file": SimpleUploadedFile(
                        "kjet-human-final-results-latest.csv",
                        raw,
                        content_type="text/csv",
                    ),
                },
            )
            self.assertEqual(response.status_code, 201, response.content)

        versions = list(HumanResultsCsv.objects.order_by("pk"))
        self.assertEqual(len(versions), 2)
        self.assertNotEqual(versions[0].file.name, versions[1].file.name)

        # The earlier version's bytes are still its own, not the later upload's.
        for version, raw in zip(versions, (first, second)):
            with version.file.open("rb") as handle:
                stored = handle.read()
            self.assertEqual(csvtools.sha256(stored), version.sha256)
            self.assertEqual(stored, raw)
