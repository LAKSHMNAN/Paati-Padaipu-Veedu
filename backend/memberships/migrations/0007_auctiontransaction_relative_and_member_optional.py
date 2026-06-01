from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0006_remove_auctionitem_price_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="auctiontransaction",
            name="member",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="auction_transactions",
                to="memberships.member",
            ),
        ),
        migrations.AlterField(
            model_name="auctiontransaction",
            name="native_place",
            field=models.CharField(
                blank=True,
                choices=[("Nerkuppai", "Nerkuppai"), ("Vendanpatti", "Vendanpatti")],
                editable=False,
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="auctiontransaction",
            name="relative",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="auction_transactions",
                to="memberships.relative",
            ),
        ),
    ]
