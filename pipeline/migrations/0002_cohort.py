import django.db.models.deletion
from django.db import migrations, models

# Cohorts that already exist as directories under ui/public and as CSVs under
# scripts/human. Seeded here so the slugs stay the single source of truth.
INITIAL_COHORTS = [
    ("latest", "Cohort 2 (current)", True),
    ("c1", "Cohort 1", False),
]


def create_cohorts(apps, schema_editor):
    Cohort = apps.get_model("pipeline", "Cohort")
    HumanResultsCsv = apps.get_model("pipeline", "HumanResultsCsv")

    for slug, label, is_current in INITIAL_COHORTS:
        Cohort.objects.get_or_create(
            slug=slug, defaults={"label": label, "is_current": is_current}
        )

    # Point existing rows at the cohort matching the slug they stored.
    for version in HumanResultsCsv.objects.all():
        cohort, _ = Cohort.objects.get_or_create(
            slug=version.cohort_slug or "latest",
            defaults={"label": version.cohort_slug or "latest", "is_current": False},
        )
        version.cohort = cohort
        version.save(update_fields=["cohort"])


def restore_slugs(apps, schema_editor):
    HumanResultsCsv = apps.get_model("pipeline", "HumanResultsCsv")
    for version in HumanResultsCsv.objects.all():
        version.cohort_slug = version.cohort.slug
        version.save(update_fields=["cohort_slug"])


class Migration(migrations.Migration):

    dependencies = [("pipeline", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="Cohort",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("slug", models.SlugField(max_length=32, unique=True)),
                ("label", models.CharField(max_length=64)),
                (
                    "is_current",
                    models.BooleanField(
                        default=False,
                        help_text="Pre-selected when uploading a new CSV.",
                    ),
                ),
            ],
            options={"ordering": ["-is_current", "slug"]},
        ),
        migrations.RenameField(
            model_name="humanresultscsv", old_name="cohort", new_name="cohort_slug"
        ),
        migrations.AddField(
            model_name="humanresultscsv",
            name="cohort",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="csv_versions",
                to="pipeline.cohort",
            ),
        ),
        migrations.RunPython(create_cohorts, restore_slugs),
        migrations.RemoveField(model_name="humanresultscsv", name="cohort_slug"),
        migrations.AlterField(
            model_name="humanresultscsv",
            name="cohort",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="csv_versions",
                to="pipeline.cohort",
            ),
        ),
    ]
