from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0014_registrationlogin"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="RegistrationLogin",
            new_name="Registration",
        ),
        migrations.AlterModelTable(
            name="registration",
            table="registration",
        ),
        migrations.CreateModel(
            name="Login",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("username", models.CharField(max_length=150)),
                ("is_successful", models.BooleanField(default=False)),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                (
                    "registration",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="login_records",
                        to="memberships.registration",
                    ),
                ),
            ],
            options={
                "db_table": "login",
                "ordering": ["-created_at"],
            },
        ),
    ]
