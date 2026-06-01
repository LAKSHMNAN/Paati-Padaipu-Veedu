from django.db import migrations, models
import django.db.models.deletion


def populate_item_tokens(apps, schema_editor):
    AuctionItem = apps.get_model("memberships", "AuctionItem")
    AuctionItemToken = apps.get_model("memberships", "AuctionItemToken")

    for item in AuctionItem.objects.all():
        for token in item.tokens or []:
            AuctionItemToken.objects.create(item_id=item.id, token_number=token)


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0009_alter_auctiontransaction_price"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuctionItemToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token_number", models.PositiveIntegerField(unique=True)),
                (
                    "item",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="token_entries",
                        to="memberships.auctionitem",
                    ),
                ),
            ],
            options={
                "ordering": ["token_number"],
            },
        ),
        migrations.RunPython(populate_item_tokens, migrations.RunPython.noop),
        migrations.DeleteModel(
            name="AuctionTokenSequence",
        ),
    ]
