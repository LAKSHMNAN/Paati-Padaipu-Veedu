from django.db import migrations, models


def rename_vendanpatti(apps, schema_editor):
    Member = apps.get_model("memberships", "Member")
    Member.objects.filter(native_place="Vendanpatti").update(native_place="Vendhanpatti")


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0024_remove_relative_phone2_unique"),
    ]

    operations = [
        migrations.RunPython(rename_vendanpatti, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="member",
            name="native_place",
            field=models.CharField(
                choices=[("Nerkuppai", "Nerkuppai"), ("Vendhanpatti", "Vendhanpatti")],
                max_length=20,
            ),
        ),
    ]
