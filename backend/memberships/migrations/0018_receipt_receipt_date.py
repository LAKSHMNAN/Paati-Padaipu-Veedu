from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0017_registration_is_admin_seed_admin"),
    ]

    operations = [
        migrations.AddField(
            model_name="receipt",
            name="receipt_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
