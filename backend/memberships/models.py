from decimal import Decimal
from functools import lru_cache

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.db import IntegrityError, models, transaction
from django.utils import timezone
from deep_translator import GoogleTranslator


phone_validator = RegexValidator(
    regex=r"^[6-9]\d{9}$",
    message="Phone number must be a valid 10-digit mobile number.",
)


def normalize_phone(value):
    if value in (None, ""):
        return None
    return str(value).strip()


def normalize_token_list(value, field_name="tokens"):
    if value in (None, ""):
        return []

    if isinstance(value, str):
        raw_values = [part.strip() for part in value.split(",")]
    elif isinstance(value, (list, tuple)):
        raw_values = value
    else:
        raise ValidationError({field_name: "Tokens must be a comma-separated list of numbers."})

    tokens = []
    for raw_value in raw_values:
        if raw_value in (None, ""):
            continue
        try:
            token = int(str(raw_value).strip())
        except (TypeError, ValueError):
            raise ValidationError({field_name: "Tokens must contain only whole numbers."})
        if token <= 0:
            raise ValidationError({field_name: "Tokens must be positive whole numbers."})
        tokens.append(token)
    return tokens


AUCTION_ITEM_PHRASE_TRANSLATIONS = {
    "coconut": "\u0ba4\u0bc7\u0b99\u0bcd\u0b95\u0bbe\u0baf\u0bcd",
    "vinayaga paanai": "\u0bb5\u0bbf\u0ba8\u0bbe\u0baf\u0b95 \u0baa\u0bbe\u0ba9\u0bc8",
    "vinayagar paanai": "\u0bb5\u0bbf\u0ba8\u0bbe\u0baf\u0b95\u0bb0\u0bcd \u0baa\u0bbe\u0ba9\u0bc8",
    "vinayaka paanai": "\u0bb5\u0bbf\u0ba8\u0bbe\u0baf\u0b95 \u0baa\u0bbe\u0ba9\u0bc8",
    "silver lamp": "\u0bb5\u0bc6\u0bb3\u0bcd\u0bb3\u0bbf \u0bb5\u0bbf\u0bb3\u0b95\u0bcd\u0b95\u0bc1",
    "brass lamp": "\u0baa\u0bbf\u0ba4\u0bcd\u0ba4\u0bb3\u0bc8 \u0bb5\u0bbf\u0bb3\u0b95\u0bcd\u0b95\u0bc1",
}

AUCTION_ITEM_WORD_TRANSLATIONS = {
    "coconut": "\u0ba4\u0bc7\u0b99\u0bcd\u0b95\u0bbe\u0baf\u0bcd",
    "vinayaga": "\u0bb5\u0bbf\u0ba8\u0bbe\u0baf\u0b95",
    "vinayagar": "\u0bb5\u0bbf\u0ba8\u0bbe\u0baf\u0b95\u0bb0\u0bcd",
    "vinayaka": "\u0bb5\u0bbf\u0ba8\u0bbe\u0baf\u0b95",
    "paanai": "\u0baa\u0bbe\u0ba9\u0bc8",
    "panai": "\u0baa\u0bbe\u0ba9\u0bc8",
    "lamp": "\u0bb5\u0bbf\u0bb3\u0b95\u0bcd\u0b95\u0bc1",
    "silver": "\u0bb5\u0bc6\u0bb3\u0bcd\u0bb3\u0bbf",
    "brass": "\u0baa\u0bbf\u0ba4\u0bcd\u0ba4\u0bb3\u0bc8",
    "plate": "\u0ba4\u0b9f\u0bcd\u0b9f\u0bc1",
    "pot": "\u0baa\u0bbe\u0ba9\u0bc8",
    "bowl": "\u0b95\u0bbf\u0ba3\u0bcd\u0ba3\u0bae\u0bcd",
    "bucket": "\u0bb5\u0bbe\u0bb3\u0bbf",
    "chair": "\u0ba8\u0bbe\u0bb1\u0bcd\u0b95\u0bbe\u0bb2\u0bbf",
    "table": "\u0bae\u0bc7\u0b9a\u0bc8",
    "fan": "\u0bb5\u0bbf\u0b9a\u0bbf\u0bb1\u0bbf",
    "saree": "\u0b9a\u0bc7\u0bb2\u0bc8",
    "vessel": "\u0baa\u0bbe\u0ba4\u0bcd\u0ba4\u0bbf\u0bb0\u0bae\u0bcd",
    "rice": "\u0b85\u0bb0\u0bbf\u0b9a\u0bbf",
    "ghee": "\u0ba8\u0bc6\u0baf\u0bcd",
    "oil": "\u0b8e\u0ba3\u0bcd\u0ba3\u0bc6\u0baf\u0bcd",
    "deepam": "\u0ba4\u0bc0\u0baa\u0bae\u0bcd",
}


# Override earlier mojibake literals with proper Tamil Unicode values.
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

@lru_cache(maxsize=512)
def translate_auction_item_name_to_tamil(name):
    cleaned_name = " ".join(str(name or "").split())
    if not cleaned_name:
        return ""

    try:
        translator = GoogleTranslator(
            source="en",
            target="ta",
            proxies={"http": "", "https": ""},
        )
        translated_text = translator.translate(cleaned_name)
    except Exception:
        return cleaned_name

    translated_text = " ".join(str(translated_text or "").split())
    return translated_text or cleaned_name


def translate_auction_item_name_with_google(name):
    return translate_auction_item_name_to_tamil(name)


def phone_exists_elsewhere(model_class, field_names, phone, instance_pk=None):
    if not phone:
        return False
    query = models.Q()
    for field_name in field_names:
        query |= models.Q(**{field_name: phone})
    queryset = model_class.objects.filter(query)
    if instance_pk is not None:
        queryset = queryset.exclude(pk=instance_pk)
    return queryset.exists()


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Registration(TimeStampedModel):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(blank=True)
    password_hash = models.CharField(max_length=255)
    last_login_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)

    class Meta:
        db_table = "registration"
        ordering = ["username"]

    def mark_logged_in(self):
        self.last_login_at = timezone.now()
        self.save(update_fields=["last_login_at", "updated_at"])

    def __str__(self):
        return self.username


class Login(TimeStampedModel):
    registration = models.ForeignKey(
        Registration,
        on_delete=models.CASCADE,
        related_name="login_records",
        null=True,
        blank=True,
    )
    username = models.CharField(max_length=150)
    is_successful = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "login"
        ordering = ["-created_at"]

    def __str__(self):
        status = "Success" if self.is_successful else "Failed"
        return f"{self.username} - {status}"


class Member(TimeStampedModel):
    class NativePlace(models.TextChoices):
        NERKUPPAI = "Nerkuppai", "Nerkuppai"
        VENDANPATTI = "Vendanpatti", "Vendanpatti"

    member_id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=255)
    patta_name = models.CharField(max_length=255)
    primary_phone = models.CharField(max_length=10, unique=True, validators=[phone_validator])
    secondary_phone = models.CharField(max_length=10, blank=True, null=True, validators=[phone_validator], unique=True)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    address_line3 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    pincode = models.CharField(max_length=6, validators=[RegexValidator(regex=r"^\d{6}$", message="Pincode must be 6 digits.")])
    native_place = models.CharField(max_length=20, choices=NativePlace.choices)

    class Meta:
        ordering = ["member_id"]

    def clean(self):
        self.primary_phone = normalize_phone(self.primary_phone)
        self.secondary_phone = normalize_phone(self.secondary_phone)
        if self.secondary_phone and self.secondary_phone == self.primary_phone:
            raise ValidationError({"secondary_phone": "Secondary phone must be different from primary phone."})
        if phone_exists_elsewhere(Member, ["primary_phone", "secondary_phone"], self.primary_phone, self.pk):
            raise ValidationError({"primary_phone": "This phone number is already in use."})
        if self.secondary_phone and phone_exists_elsewhere(Member, ["primary_phone", "secondary_phone"], self.secondary_phone, self.pk):
            raise ValidationError({"secondary_phone": "This phone number is already in use."})
        if phone_exists_elsewhere(Relative, ["phone_1", "phone_2"], self.primary_phone):
            raise ValidationError({"primary_phone": "This phone number is already assigned to a relative."})
        if self.secondary_phone and phone_exists_elsewhere(Relative, ["phone_1", "phone_2"], self.secondary_phone):
            raise ValidationError({"secondary_phone": "This phone number is already assigned to a relative."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.member_id} - {self.name}"


class Relative(TimeStampedModel):
    class RelativeType(models.TextChoices):
        GUEST = "Guest", "Guest"
        PENN_VITARR = "Penn Vitarr", "Penn Vitarr"

    non_member_id = models.CharField(max_length=20, unique=True, blank=True, editable=False)
    name = models.CharField(max_length=255)
    phone_1 = models.CharField(max_length=10, unique=True, validators=[phone_validator])
    phone_2 = models.CharField(max_length=10, blank=True, null=True, unique=True, validators=[phone_validator])
    type = models.CharField(max_length=20, choices=RelativeType.choices)

    class Meta:
        ordering = ["name"]

    def clean(self):
        self.phone_1 = normalize_phone(self.phone_1)
        self.phone_2 = normalize_phone(self.phone_2)
        if self.phone_2 and self.phone_2 == self.phone_1:
            raise ValidationError({"phone_2": "Secondary phone must be different from primary phone."})
        if phone_exists_elsewhere(Relative, ["phone_1", "phone_2"], self.phone_1, self.pk):
            raise ValidationError({"phone_1": "This phone number is already in use."})
        if self.phone_2 and phone_exists_elsewhere(Relative, ["phone_1", "phone_2"], self.phone_2, self.pk):
            raise ValidationError({"phone_2": "This phone number is already in use."})
        if phone_exists_elsewhere(Member, ["primary_phone", "secondary_phone"], self.phone_1):
            raise ValidationError({"phone_1": "This phone number is already assigned to a member."})
        if self.phone_2 and phone_exists_elsewhere(Member, ["primary_phone", "secondary_phone"], self.phone_2):
            raise ValidationError({"phone_2": "This phone number is already assigned to a member."})

    @classmethod
    def _next_non_member_id(cls):
        existing_ids = (
            cls.objects.select_for_update()
            .filter(non_member_id__startswith="NMEM_")
            .values_list("non_member_id", flat=True)
        )
        used_numbers = []
        for non_member_id in existing_ids:
            try:
                used_numbers.append(int(str(non_member_id).rsplit("_", 1)[1]))
            except (IndexError, ValueError):
                continue
        return f"NMEM_{max(used_numbers, default=100) + 1}"

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if not self.non_member_id:
                self.non_member_id = self._next_non_member_id()
            self.full_clean()
            return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.non_member_id} - {self.name}"


class Receipt(TimeStampedModel):
    receipt_no = models.CharField(max_length=30, primary_key=True)
    member = models.ForeignKey(Member, on_delete=models.PROTECT, related_name="receipts", null=True, blank=True)
    relative = models.ForeignKey(Relative, on_delete=models.PROTECT, related_name="receipts", null=True, blank=True)
    phone_number = models.CharField(max_length=10, validators=[phone_validator])
    receipt_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["receipt_no"]

    def clean(self):
        if bool(self.member) == bool(self.relative):
            raise ValidationError("Choose either a member or a non-member for the receipt.")

        self.phone_number = normalize_phone(self.phone_number)
        if self.member:
            allowed_numbers = {self.member.primary_phone}
            if self.member.secondary_phone:
                allowed_numbers.add(self.member.secondary_phone)
            source_label = "member"
        else:
            allowed_numbers = {self.relative.phone_1}
            if self.relative.phone_2:
                allowed_numbers.add(self.relative.phone_2)
            source_label = "non-member"

        if self.phone_number not in allowed_numbers:
            raise ValidationError({"phone_number": f"Phone number must match the selected {source_label}."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.receipt_no


class AuctionItem(TimeStampedModel):
    auction_item_name = models.CharField(max_length=255)
    auction_item_name_tamil = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField()
    tokens = models.JSONField(default=list, blank=True)
    used_tokens = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["auction_item_name", "id"]

    def clean(self):
        self.auction_item_name_tamil = " ".join(str(self.auction_item_name_tamil or "").split())
        self.tokens = normalize_token_list(self.tokens, "tokens")
        self.used_tokens = normalize_token_list(self.used_tokens, "used_tokens")

        if len(set(self.tokens)) != len(self.tokens):
            raise ValidationError({"tokens": "Tokens must be unique."})
        invalid_tokens = sorted(set(self.used_tokens) - set(self.tokens))
        if invalid_tokens:
            raise ValidationError({"used_tokens": "Used tokens must belong to the item's token list."})

    @classmethod
    def _allocate_sequential_tokens(cls, count):
        if count <= 0:
            return []

        last_token_entry = AuctionItemToken.objects.select_for_update().order_by("-token_number").first()
        last_token = last_token_entry.token_number if last_token_entry else 0
        return list(range(last_token + 1, last_token + count + 1))

    def save(self, *args, **kwargs):
        with transaction.atomic():
            current_item = None
            existing_tokens = []
            existing_used_tokens = []
            if self.pk:
                current_item = AuctionItem.objects.select_for_update().get(pk=self.pk)
                existing_tokens = list(current_item.tokens or [])
                existing_used_tokens = current_item.used_tokens or []

            self.auction_item_name_tamil = translate_auction_item_name_to_tamil(self.auction_item_name)

            if current_item is None:
                self.tokens = self._allocate_sequential_tokens(self.quantity)
                self.used_tokens = []
            else:
                token_count = len(existing_tokens)
                if self.quantity < token_count:
                    raise ValidationError(
                        {"quantity": "Quantity cannot be reduced after tokens have been generated."}
                    )
                if self.quantity > token_count:
                    self.tokens = existing_tokens + self._allocate_sequential_tokens(self.quantity - token_count)
                else:
                    self.tokens = existing_tokens
                self.used_tokens = [token for token in existing_used_tokens if token in self.tokens]

            self.full_clean()

            result = super().save(*args, **kwargs)

            try:
                self.sync_token_registry()
            except IntegrityError:
                raise ValidationError({"tokens": "Tokens must be unique across all auction items."})

            return result

    def sync_token_registry(self):
        requested_tokens = list(self.tokens or [])
        existing_entries = {
            entry.token_number: entry
            for entry in AuctionItemToken.objects.select_for_update().filter(item=self)
        }
        conflicting_tokens = list(
            AuctionItemToken.objects.select_for_update()
            .filter(token_number__in=requested_tokens)
            .exclude(item=self)
            .values_list("token_number", flat=True)
        )
        if conflicting_tokens:
            raise ValidationError({"tokens": "Tokens must be unique across all auction items."})

        tokens_to_remove = [token for token in existing_entries if token not in requested_tokens]
        if tokens_to_remove:
            AuctionItemToken.objects.filter(item=self, token_number__in=tokens_to_remove).delete()

        for token in requested_tokens:
            AuctionItemToken.objects.update_or_create(
                token_number=token,
                defaults={
                    "item": self,
                    "auction_item_name": self.auction_item_name,
                    "used_token_number": token if token in set(self.used_tokens or []) else None,
                },
            )

    @classmethod
    def sync_used_tokens(cls, item_ids):
        item_ids = list(set(item_ids))
        if not item_ids:
            return

        for item in cls.objects.select_for_update().filter(pk__in=item_ids):
            used_tokens = list(
                AuctionTransaction.objects.filter(item=item)
                .order_by("created_at", "id")
                .values_list("token_number", flat=True)
            )
            cls.objects.filter(pk=item.pk).update(used_tokens=used_tokens)
            AuctionItemToken.objects.filter(item=item).update(auction_item_name=item.auction_item_name)
            AuctionItemToken.objects.filter(item=item, token_number__in=used_tokens).update(
                used_token_number=models.F("token_number")
            )
            AuctionItemToken.objects.filter(item=item).exclude(token_number__in=used_tokens).update(
                used_token_number=None
            )

    def __str__(self):
        return self.auction_item_name


class AuctionItemToken(models.Model):
    item = models.ForeignKey(AuctionItem, on_delete=models.CASCADE, related_name="token_entries")
    auction_item_name = models.CharField(max_length=255, editable=False)
    token_number = models.PositiveIntegerField(primary_key=True)
    used_token_number = models.PositiveIntegerField(null=True, blank=True, unique=True)

    class Meta:
        ordering = ["token_number"]


class AuctionTransaction(TimeStampedModel):
    class PaymentStatus(models.TextChoices):
        PAID = "Paid", "Paid"
        UNPAID = "Unpaid", "Unpaid"

    member = models.ForeignKey(
        Member,
        on_delete=models.PROTECT,
        related_name="auction_transactions",
        null=True,
        blank=True,
    )
    relative = models.ForeignKey(
        Relative,
        on_delete=models.PROTECT,
        related_name="auction_transactions",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255, editable=False)
    primary_phone_number = models.CharField(max_length=10, editable=False)
    native_place = models.CharField(max_length=20, choices=Member.NativePlace.choices, editable=False, blank=True)
    item = models.ForeignKey("AuctionItem", on_delete=models.PROTECT, related_name="auction_transactions")
    token_number = models.PositiveIntegerField()
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices)
    receipt = models.ForeignKey(
        Receipt,
        on_delete=models.PROTECT,
        related_name="auction_transactions",
        blank=True,
        null=True,
    )
    challan = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Auction_Transaction"
        verbose_name_plural = "Auction_Transactions"

    def clean(self):
        if bool(self.member) == bool(self.relative):
            raise ValidationError("Choose either a member or a non-member for the transaction.")

        if not self.token_number:
            raise ValidationError({"token_number": "Token number is required."})

        token_entry = AuctionItemToken.objects.select_related("item").filter(token_number=self.token_number).first()
        if not token_entry:
            raise ValidationError({"token_number": "Invalid token number"})
        self.item = token_entry.item

        if self.member:
            self.name = self.member.name
            self.primary_phone_number = self.member.primary_phone
            self.native_place = self.member.native_place
            if self.receipt and (self.receipt.member_id != self.member_id or self.receipt.relative_id):
                raise ValidationError({"receipt": "Receipt must belong to the selected member."})
        else:
            self.name = self.relative.name
            self.primary_phone_number = self.relative.phone_1
            self.native_place = ""
            if self.receipt and (self.receipt.relative_id != self.relative_id or self.receipt.member_id):
                raise ValidationError({"receipt": "Receipt must belong to the selected non-member."})

        used_tokens = set(self.item.used_tokens or [])
        if self.pk:
            previous_token = (
                AuctionTransaction.objects.filter(pk=self.pk)
                .values_list("token_number", flat=True)
                .first()
            )
            if previous_token is not None:
                used_tokens.discard(previous_token)

        if self.token_number in used_tokens:
            raise ValidationError({"token_number": "Token already used"})

    def save(self, *args, **kwargs):
        with transaction.atomic():
            previous_item_id = None
            if self.pk:
                previous = (
                    AuctionTransaction.objects.select_for_update()
                    .filter(pk=self.pk)
                    .values("item_id")
                    .first()
                )
                if previous:
                    previous_item_id = previous["item_id"]

            token_entry = (
                AuctionItemToken.objects.select_for_update()
                .select_related("item")
                .filter(token_number=self.token_number)
                .first()
            )
            if not token_entry:
                raise ValidationError({"token_number": "Invalid token number"})

            item_ids_to_lock = {token_entry.item_id}
            if previous_item_id:
                item_ids_to_lock.add(previous_item_id)

            locked_items = {
                item.id: item
                for item in AuctionItem.objects.select_for_update().filter(id__in=item_ids_to_lock)
            }
            self.item = locked_items[token_entry.item_id]

            self.full_clean()
            result = super().save(*args, **kwargs)
            AuctionItem.sync_used_tokens(item_ids_to_lock)
            return result

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            item = AuctionItem.objects.select_for_update().get(pk=self.item_id)
            result = super().delete(*args, **kwargs)
            AuctionItem.sync_used_tokens([item.pk])
            return result

    def __str__(self):
        source = self.member_id or self.relative_id or self.name
        return f"{source} - {self.item.auction_item_name}"


class AuctionReport(TimeStampedModel):
    class ReportStatus(models.TextChoices):
        ALL = "All", "All"
        PAID = "Paid", "Paid"
        UNPAID = "Unpaid", "Unpaid"

    report_status = models.CharField(max_length=20, choices=ReportStatus.choices)
    generated_at = models.DateTimeField(default=timezone.now)
    transaction_count = models.PositiveIntegerField(default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    summary = models.JSONField(default=dict)
    payment_status_breakdown = models.JSONField(default=list, blank=True)
    transactions = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "auction_report"
        ordering = ["-generated_at", "-id"]

    def __str__(self):
        return f"{self.report_status} report - {self.generated_at:%Y-%m-%d %H:%M}"


class Deposit(TimeStampedModel):
    receipt = models.ForeignKey(Receipt, on_delete=models.PROTECT, related_name="deposits")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    date = models.DateField()

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.receipt_id} - {self.amount}"


class EelamEntry(TimeStampedModel):
    class EntryType(models.TextChoices):
        MEMBER = "Member", "Member"
        NON_MEMBER = "Non-Member", "Non-Member"

    type = models.CharField(max_length=20, choices=EntryType.choices)
    member = models.ForeignKey(Member, on_delete=models.PROTECT, null=True, blank=True, related_name="eelam_entries")
    relative = models.ForeignKey(Relative, on_delete=models.PROTECT, null=True, blank=True, related_name="eelam_entries")
    phone = models.CharField(max_length=10, validators=[phone_validator], editable=False)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Eelam Entry"
        verbose_name_plural = "Eelam Entries"

    def clean(self):
        if self.type == self.EntryType.MEMBER:
            if not self.member or self.relative:
                raise ValidationError("For Member type, choose a member only.")
            self.phone = self.member.primary_phone
        elif self.type == self.EntryType.NON_MEMBER:
            if not self.relative or self.member:
                raise ValidationError("For Non-Member type, choose a relative only.")
            self.phone = self.relative.phone_1
        else:
            raise ValidationError({"type": "Invalid eelam type."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.type} - {self.amount}"


class Donation(TimeStampedModel):
    class DonorType(models.TextChoices):
        MEMBER = "Member", "Member"
        NON_MEMBER = "Non-Member", "Non-Member"

    donor_type = models.CharField(max_length=20, choices=DonorType.choices)
    member = models.ForeignKey(Member, on_delete=models.PROTECT, null=True, blank=True, related_name="donations")
    relative = models.ForeignKey(Relative, on_delete=models.PROTECT, null=True, blank=True, related_name="donations")
    donor_name = models.CharField(max_length=255, editable=False)
    phone = models.CharField(max_length=10, validators=[phone_validator], editable=False)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        if self.donor_type == self.DonorType.MEMBER:
            if not self.member or self.relative:
                raise ValidationError("For Member donation, choose a member only.")
            self.donor_name = self.member.name
            self.phone = self.member.primary_phone
        elif self.donor_type == self.DonorType.NON_MEMBER:
            if not self.relative or self.member:
                raise ValidationError("For Non-Member donation, choose a non-member only.")
            self.donor_name = self.relative.name
            self.phone = self.relative.phone_1
        else:
            raise ValidationError({"donor_type": "Invalid donor type."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.donor_type} - {self.donor_name} - {self.amount}"
