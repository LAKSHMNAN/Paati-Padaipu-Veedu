from django.db import migrations, models


def populate_auction_item_token_fields(apps, schema_editor):
    AuctionItem = apps.get_model("memberships", "AuctionItem")
    AuctionItemToken = apps.get_model("memberships", "AuctionItemToken")

    for token_entry in AuctionItemToken.objects.select_related("item").all():
        item = token_entry.item
        token_entry.auction_item_name = item.auction_item_name
        token_entry.used_token_number = (
            token_entry.token_number if token_entry.token_number in (item.used_tokens or []) else None
        )
        token_entry.save(update_fields=["auction_item_name", "used_token_number"])

    for item in AuctionItem.objects.all():
        AuctionItemToken.objects.filter(item_id=item.id, auction_item_name="").update(
            auction_item_name=item.auction_item_name
        )


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0010_auctionitemtoken_delete_auctiontokensequence"),
    ]

    operations = [
        migrations.AddField(
            model_name="auctionitemtoken",
            name="auction_item_name",
            field=models.CharField(default="", editable=False, max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="auctionitemtoken",
            name="used_token_number",
            field=models.PositiveIntegerField(blank=True, null=True, unique=True),
        ),
        migrations.RunPython(populate_auction_item_token_fields, migrations.RunPython.noop),
    ]
