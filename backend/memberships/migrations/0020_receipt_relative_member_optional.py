from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0019_relative_non_member_id"),
    ]

    operations = [
        migrations.AlterField(
            model_name="receipt",
            name="member",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="receipts",
                to="memberships.member",
            ),
        ),
        migrations.AddField(
            model_name="receipt",
            name="relative",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="receipts",
                to="memberships.relative",
            ),
        ),
    ]
