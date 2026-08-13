from django.contrib import admin

from pipeline.models import HumanResultsCsv, PipelineRun


@admin.register(HumanResultsCsv)
class HumanResultsCsvAdmin(admin.ModelAdmin):
    list_display = ("id", "cohort", "status", "source", "row_count", "created_at", "published_at")
    list_filter = ("cohort", "status", "source")
    readonly_fields = ("sha256", "fingerprint", "created_at")


@admin.register(PipelineRun)
class PipelineRunAdmin(admin.ModelAdmin):
    list_display = ("id", "csv", "status", "current_step", "created_at", "finished_at")
    list_filter = ("status",)
    readonly_fields = ("diff", "log", "changed_outputs", "published_keys", "created_at")
