from django.db import migrations, models


def backfill_non_member_ids(apps, schema_editor):
    Relative = apps.get_model("memberships", "Relative")
    for index, relative in enumerate(Relative.objects.order_by("created_at", "id"), start=101):
        relative.non_member_id = f"NMEM_{index}"
        relative.save(update_fields=["non_member_id"])


def clear_non_member_ids(apps, schema_editor):
    Relative = apps.get_model("memberships", "Relative")
    Relative.objects.update(non_member_id="")


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0018_receipt_receipt_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="relative",
            name="non_member_id",
            field=models.CharField(blank=True, editable=False, max_length=20, null=True, unique=True),
        ),
        migrations.RunPython(backfill_non_member_ids, clear_non_member_ids),
        migrations.AlterField(
            model_name="relative",
            name="non_member_id",
            field=models.CharField(blank=True, editable=False, max_length=20, unique=True),
        ),
    ]
