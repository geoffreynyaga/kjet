from rest_framework import serializers

from pipeline.models import Cohort, HumanResultsCsv, PipelineRun


class CohortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cohort
        fields = ["id", "slug", "label", "is_current"]


class HumanResultsCsvSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.StringRelatedField()
    cohort = CohortSerializer(read_only=True)

    class Meta:
        model = HumanResultsCsv
        fields = [
            "id",
            "cohort",
            "original_filename",
            "source",
            "source_url",
            "sha256",
            "status",
            "row_count",
            "uploaded_by",
            "created_at",
            "published_at",
        ]


class PipelineRunSerializer(serializers.ModelSerializer):
    csv = HumanResultsCsvSerializer(read_only=True)
    started_by = serializers.StringRelatedField()

    class Meta:
        model = PipelineRun
        fields = [
            "id",
            "csv",
            "status",
            "current_step",
            "steps_done",
            "steps_total",
            "error",
            "changed_outputs",
            "published_keys",
            "started_by",
            "created_at",
            "finished_at",
        ]


class PipelineRunDetailSerializer(PipelineRunSerializer):
    log_tail = serializers.SerializerMethodField()

    class Meta(PipelineRunSerializer.Meta):
        fields = PipelineRunSerializer.Meta.fields + ["diff", "log_tail"]

    def get_log_tail(self, obj):
        lines = (obj.log or "").splitlines()
        return "\n".join(lines[-40:])
