"""Builds dashboard outputs from a CSV version inside an isolated sandbox.

Nothing here writes to the repository working tree or to S3. A run produces
files under a per-run temporary directory; publishing them is a separate,
explicitly approved step (see publish_run).
"""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from django.conf import settings

REPO_ROOT = Path(settings.BASE_DIR)

# The dashboard files a human-CSV run can regenerate.
OUTPUT_FILES = [
    "kjet-human-final.json",
    "kjet-human-first.json",
    "baseline-first-results.json",
    "baseline-final-results.json",
    "baseline-combined.json",
    "comparison_data.json",
]


class StepFailed(Exception):
    def __init__(self, step, output):
        super().__init__(f"{step} failed")
        self.step = step
        self.output = output


def repo_output_dir(cohort):
    return REPO_ROOT / "ui" / "public" / cohort


def create_sandbox(csv_bytes, cohort):
    """Lay out a sandbox holding the current outputs plus the new CSV.

    The outputs are seeded from the repository because a human-CSV run only
    regenerates the final-derived files. Without the seed, combine_baseline.py
    would find no first-round data and baseline-combined.json would silently
    lose every first-round applicant.
    """
    sandbox = Path(tempfile.mkdtemp(prefix="kjet-pipeline-"))
    (sandbox / "scripts" / "human").mkdir(parents=True)
    output_dir = sandbox / "ui" / "public" / cohort
    output_dir.mkdir(parents=True)

    source_dir = repo_output_dir(cohort)
    if source_dir.is_dir():
        for entry in source_dir.glob("*.json"):
            shutil.copy2(entry, output_dir / entry.name)

    # Any first-round CSV still in the repo travels with the run.
    first_csv = REPO_ROOT / "scripts" / "human" / f"kjet-human-first-results-{cohort}.csv"
    if first_csv.exists():
        shutil.copy2(first_csv, sandbox / "scripts" / "human" / first_csv.name)

    target = sandbox / "scripts" / "human" / f"kjet-human-final-results-{cohort}.csv"
    target.write_bytes(csv_bytes)
    return sandbox


def run_make(target, cohort, sandbox):
    """Run a make target against the sandbox, returning combined output."""
    command = [
        "make",
        target,
        f"COHORT={cohort}",
        f"WORKSPACE={sandbox}",
    ]
    env = dict(os.environ)
    env.setdefault("PY", str(REPO_ROOT / "venv" / "bin" / "python3"))
    completed = subprocess.run(
        command,
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=getattr(settings, "PIPELINE_STEP_TIMEOUT", 900),
    )
    output = (completed.stdout or "") + (completed.stderr or "")
    if completed.returncode != 0:
        raise StepFailed(f"make {target}", output)
    return output


def collect_outputs(sandbox, cohort):
    """Which built files differ from what the repository currently holds."""
    built_dir = sandbox / "ui" / "public" / cohort
    current_dir = repo_output_dir(cohort)

    changed = []
    for name in OUTPUT_FILES:
        built = built_dir / name
        if not built.exists():
            continue
        current = current_dir / name
        if current.exists() and current.read_bytes() == built.read_bytes():
            continue
        changed.append(
            {
                "name": name,
                "bytes": built.stat().st_size,
                "existed": current.exists(),
            }
        )
    return changed


def discard_sandbox(path):
    if path:
        shutil.rmtree(path, ignore_errors=True)
