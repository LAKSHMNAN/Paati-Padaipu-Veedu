from django.db import migrations
import re


PHRASE_TRANSLATIONS = {
    "coconut": "தேங்காய்",
    "vinayaga paanai": "விநாயக பானை",
    "vinayagar paanai": "விநாயகர் பானை",
    "vinayaka paanai": "விநாயக பானை",
    "silver lamp": "வெள்ளி விளக்கு",
    "brass lamp": "பித்தளை விளக்கு",
}

WORD_TRANSLATIONS = {
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


def translate_name(name):
    cleaned_name = " ".join(str(name or "").split())
    if not cleaned_name:
        return ""

    direct_translation = PHRASE_TRANSLATIONS.get(cleaned_name.lower())
    if direct_translation:
        return direct_translation

    parts = re.split(r"(\s+|[-/&(),])", cleaned_name)
    translated_parts = []
    for part in parts:
        normalized = re.sub(r"[^a-z]", "", part.lower())
        if not normalized:
            translated_parts.append(part)
            continue
        translated = WORD_TRANSLATIONS.get(normalized)
        if not translated:
            return ""
        translated_parts.append(translated)
    return "".join(translated_parts).strip()


def repair_auction_item_tamil_text(apps, schema_editor):
    AuctionItem = apps.get_model("memberships", "AuctionItem")
    for item in AuctionItem.objects.all():
        translated_name = translate_name(item.auction_item_name)
        if translated_name != item.auction_item_name_tamil:
            item.auction_item_name_tamil = translated_name
            item.save(update_fields=["auction_item_name_tamil"])


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0012_remove_auctionitemtoken_id_and_more"),
    ]

    operations = [
        migrations.RunPython(repair_auction_item_tamil_text, migrations.RunPython.noop),
    ]
