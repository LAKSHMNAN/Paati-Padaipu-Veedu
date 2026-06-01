import django.core.validators
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0008_auctionitem_tokens_auctiontransaction_token_number"),
    ]

    operations = [
        migrations.AlterField(
            model_name="auctiontransaction",
            name="price",
            field=models.DecimalField(
                decimal_places=2,
                max_digits=12,
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
            ),
        ),
    ]
