import re

from django.db import migrations, models


AUCTION_ITEM_PHRASE_TRANSLATIONS = {
    "coconut": "தேங்காய்",
    "vinayaga paanai": "விநாயக பானை",
    "vinayagar paanai": "விநாயகர் பானை",
    "vinayaka paanai": "விநாயக பானை",
    "silver lamp": "வெள்ளி விளக்கு",
    "brass lamp": "பித்தளை விளக்கு",
}

AUCTION_ITEM_WORD_TRANSLATIONS = {
    "coconut": "தேங்காய்",
    "vinayaga": "விநாயக",
    "vinayagar": "விநாயகர்",
    "vinayaka": "விநாயக",
    "paanai": "பானை",
    "panai": "பானை",
    "lamp": "விளக்கு",
    "silver": "வெள்ளி",
    "brass": "பித்தளை",
    "plate": "தட்டு",
    "pot": "பானை",
    "bowl": "கிண்ணம்",
    "bucket": "வாளி",
    "chair": "நாற்காலி",
    "table": "மேசை",
    "fan": "விசிறி",
    "saree": "சேலை",
    "vessel": "பாத்திரம்",
    "rice": "அரிசி",
    "ghee": "நெய்",
    "oil": "எண்ணெய்",
    "deepam": "தீபம்",
}


def translate_auction_item_name_to_tamil(name):
    cleaned_name = " ".join(str(name or "").split())
    if not cleaned_name:
        return ""

    direct_translation = AUCTION_ITEM_PHRASE_TRANSLATIONS.get(cleaned_name.lower())
    if direct_translation:
        return direct_translation

    parts = re.split(r"(\s+|[-/&(),])", cleaned_name)
    translated_parts = []
    for part in parts:
        normalized = re.sub(r"[^a-z]", "", part.lower())
        if not normalized:
            translated_parts.append(part)
            continue
        translated = AUCTION_ITEM_WORD_TRANSLATIONS.get(normalized)
        if not translated:
            return ""
        translated_parts.append(translated)
    return "".join(translated_parts).strip()


def populate_tamil_names(apps, schema_editor):
    AuctionItem = apps.get_model("memberships", "AuctionItem")
    for item in AuctionItem.objects.all():
        item.auction_item_name_tamil = translate_auction_item_name_to_tamil(item.auction_item_name)
        item.save(update_fields=["auction_item_name_tamil"])


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0004_alter_auctiontransaction_options_donation"),
    ]

    operations = [
        migrations.AddField(
            model_name="auctionitem",
            name="auction_item_name_tamil",
            field=models.CharField(blank=True, editable=False, max_length=255),
        ),
        migrations.RunPython(populate_tamil_names, migrations.RunPython.noop),
    ]
