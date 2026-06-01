from django.contrib.auth.hashers import make_password
from django.db import migrations, models


ADMIN_USERNAME = "lakshmnan_admin"
ADMIN_PASSWORD = "adminlakshmnan"


def seed_admin_user(apps, schema_editor):
    Registration = apps.get_model("memberships", "Registration")
    admin_user, _ = Registration.objects.get_or_create(
        username=ADMIN_USERNAME,
        defaults={
            "email": "",
            "password_hash": make_password(ADMIN_PASSWORD),
            "is_active": True,
            "is_admin": True,
        },
    )
    changed_fields = []
    if not admin_user.is_admin:
        admin_user.is_admin = True
        changed_fields.append("is_admin")
    if not admin_user.is_active:
        admin_user.is_active = True
        changed_fields.append("is_active")
    admin_user.password_hash = make_password(ADMIN_PASSWORD)
    changed_fields.append("password_hash")
    admin_user.save(update_fields=changed_fields + ["updated_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0016_auctionreport"),
    ]

    operations = [
        migrations.AddField(
            model_name="registration",
            name="is_admin",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(seed_admin_user, migrations.RunPython.noop),
    ]
