from django.db import migrations, models


def rename_vendhanpatti(apps, schema_editor):
    Member = apps.get_model("memberships", "Member")
    Member.objects.filter(native_place="Vendhanpatti").update(native_place="Venthanpatti")


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0025_rename_vendanpatti_to_vendhanpatti"),
    ]

    operations = [
        migrations.RunPython(rename_vendhanpatti, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="member",
            name="native_place",
            field=models.CharField(
                choices=[("Nerkuppai", "Nerkuppai"), ("Venthanpatti", "Venthanpatti")],
                max_length=20,
            ),
        ),
    ]
