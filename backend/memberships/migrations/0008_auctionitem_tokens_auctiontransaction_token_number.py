from django.db import migrations, models


def populate_auction_tokens(apps, schema_editor):
    AuctionItem = apps.get_model("memberships", "AuctionItem")
    AuctionTokenSequence = apps.get_model("memberships", "AuctionTokenSequence")
    AuctionTransaction = apps.get_model("memberships", "AuctionTransaction")

    last_token = 0
    items = AuctionItem.objects.order_by("created_at", "id")
    for item in items:
        start_token = last_token + 1
        end_token = last_token + item.quantity
        tokens = list(range(start_token, end_token + 1))

        transactions = list(
            AuctionTransaction.objects.filter(item_id=item.id).order_by("created_at", "id")
        )
        if len(transactions) > len(tokens):
            raise RuntimeError(
                f"Auction item {item.id} has more transactions than available quantity."
            )

        used_tokens = tokens[: len(transactions)]
        item.tokens = tokens
        item.used_tokens = used_tokens
        item.save(update_fields=["tokens", "used_tokens"])

        for transaction, token_number in zip(transactions, used_tokens):
            transaction.token_number = token_number
            transaction.save(update_fields=["token_number"])

        last_token = end_token

    AuctionTokenSequence.objects.update_or_create(
        singleton_key=1,
        defaults={"last_token": last_token},
    )


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0007_auctiontransaction_relative_and_member_optional"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuctionTokenSequence",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("singleton_key", models.PositiveSmallIntegerField(default=1, editable=False, unique=True)),
                ("last_token", models.PositiveIntegerField(default=0)),
            ],
        ),
        migrations.AddField(
            model_name="auctionitem",
            name="tokens",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="auctionitem",
            name="used_tokens",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="auctiontransaction",
            name="token_number",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(populate_auction_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="auctiontransaction",
            name="token_number",
            field=models.PositiveIntegerField(),
        ),
    ]
