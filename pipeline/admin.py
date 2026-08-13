from django.contrib import admin

from pipeline.models import Cohort, HumanResultsCsv, PipelineRun


@admin.register(Cohort)
class CohortAdmin(admin.ModelAdmin):
    list_display = ("slug", "label", "is_current")
    list_editable = ("is_current",)


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
