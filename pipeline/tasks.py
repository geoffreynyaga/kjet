from celery import shared_task
from django.db import transaction
from django.utils import timezone

from pipeline import publish as publish_module
from pipeline import runner
from pipeline.models import HumanResultsCsv, PipelineRun

BUILD_STEPS = [
    "Preparing sandbox",
    "Converting human CSV",
    "Generating comparison data",
    "Checking outputs",
]


@shared_task(bind=True)
def build_run(self, run_id):
    """Build dashboard outputs for a run. Publishes nothing."""
    run = PipelineRun.objects.select_related("csv").get(pk=run_id)
    run.status = PipelineRun.Status.RUNNING
    run.celery_task_id = self.request.id or ""
    run.steps_total = len(BUILD_STEPS)
    run.save(update_fields=["status", "celery_task_id", "steps_total"])

    cohort = run.csv.cohort
    sandbox = None

    try:
        run.set_step(BUILD_STEPS[0], 0, len(BUILD_STEPS))
        with run.csv.file.open("rb") as handle:
            csv_bytes = handle.read()
        sandbox = runner.create_sandbox(csv_bytes, cohort)
        run.sandbox_path = str(sandbox)
        run.append_log(f"Sandbox: {sandbox}")
        run.set_step(BUILD_STEPS[1], 1, len(BUILD_STEPS))
        run.save(update_fields=["sandbox_path"])

        run.append_log(runner.run_make("human", cohort, sandbox))
        run.set_step(BUILD_STEPS[2], 2, len(BUILD_STEPS))

        run.append_log(runner.run_make("comparison", cohort, sandbox))
        run.set_step(BUILD_STEPS[3], 3, len(BUILD_STEPS))

        changed = runner.collect_outputs(sandbox, cohort)
        if not changed:
            run.append_log("No output file changed; nothing to publish.")

        run.changed_outputs = changed
        run.status = PipelineRun.Status.BUILT
        run.current_step = "Built"
        run.steps_done = len(BUILD_STEPS)
        run.save()

    except runner.StepFailed as exc:
        run.append_log(exc.output)
        run.error = f"{exc.step} failed. See log for details."
        run.status = PipelineRun.Status.FAILED
        run.finished_at = timezone.now()
        run.save()
        runner.discard_sandbox(sandbox)
        raise
    except Exception as exc:
        run.error = str(exc)
        run.status = PipelineRun.Status.FAILED
        run.finished_at = timezone.now()
        run.save()
        runner.discard_sandbox(sandbox)
        raise

    return run.pk


@shared_task(bind=True)
def publish_run(self, run_id):
    """Upload a built run's changed outputs and make its CSV the live version."""
    run = PipelineRun.objects.select_related("csv").get(pk=run_id)
    run.status = PipelineRun.Status.PUBLISHING
    run.celery_task_id = self.request.id or ""
    run.save(update_fields=["status", "celery_task_id"])

    cohort = run.csv.cohort
    names = [entry["name"] for entry in run.changed_outputs]

    try:
        keys = publish_module.publish_files(run.sandbox_path, cohort, names)
        publish_module.sync_to_repo(run.sandbox_path, cohort, names)

        with transaction.atomic():
            HumanResultsCsv.objects.filter(
                cohort=cohort, status=HumanResultsCsv.Status.PUBLISHED
            ).exclude(pk=run.csv_id).update(status=HumanResultsCsv.Status.SUPERSEDED)
            run.csv.status = HumanResultsCsv.Status.PUBLISHED
            run.csv.published_at = timezone.now()
            run.csv.save(update_fields=["status", "published_at"])

        run.published_keys = keys
        run.status = PipelineRun.Status.PUBLISHED
        run.current_step = "Published"
        run.finished_at = timezone.now()
        run.append_log(f"Published {len(keys)} file(s).")
        run.save()
    except Exception as exc:
        run.error = f"Publish failed: {exc}"
        run.status = PipelineRun.Status.FAILED
        run.finished_at = timezone.now()
        run.save()
        raise
    finally:
        runner.discard_sandbox(run.sandbox_path)

    return run.pk
