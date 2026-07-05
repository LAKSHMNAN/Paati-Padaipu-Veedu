from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q, Sum
from rest_framework import serializers

from .models import (
    AuctionItem,
    AuctionTransaction,
    Deposit,
    Donation,
    EelamEntry,
    Member,
    Receipt,
    Registration,
    Relative,
)


class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = ["id", "username", "email", "last_login_at", "is_admin"]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("Username is required.")
        if Registration.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("This username is already registered.")
        return username

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        return Registration.objects.create(password_hash=make_password(password), **validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class CommaSeparatedTokenField(serializers.Field):
    default_error_messages = {
        "invalid": "Tokens must be a comma-separated list of numbers.",
    }

    def to_representation(self, value):
        return ",".join(str(token) for token in (value or []))

    def to_internal_value(self, data):
        if isinstance(data, list):
            parts = data
        elif isinstance(data, str):
            parts = [part.strip() for part in data.split(",")]
        else:
            self.fail("invalid")

        tokens = []
        for part in parts:
            if part in (None, ""):
                continue
            try:
                tokens.append(int(str(part).strip()))
            except (TypeError, ValueError):
                self.fail("invalid")
        return tokens


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = "__all__"


class ReceiptSerializer(serializers.ModelSerializer):
    DUPLICATE_RECEIPT_MESSAGE = "This receipt number is already used so use another receipt number"

    member_name = serializers.CharField(source="member.name", read_only=True, allow_null=True)
    relative_name = serializers.CharField(source="relative.name", read_only=True, allow_null=True)
    non_member_id = serializers.CharField(source="relative.non_member_id", read_only=True, allow_null=True)
    source_id = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    source_type = serializers.SerializerMethodField()

    class Meta:
        model = Receipt
        fields = [
            "receipt_no",
            "member",
            "relative",
            "member_name",
            "relative_name",
            "non_member_id",
            "source_id",
            "source_name",
            "source_type",
            "phone_number",
            "receipt_date",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "receipt_no": {"validators": []},
        }

    def validate_receipt_no(self, value):
        receipt_no = str(value or "").strip()
        if not receipt_no:
            raise serializers.ValidationError("Receipt No is required.")

        queryset = Receipt.objects.filter(receipt_no=receipt_no)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(self.DUPLICATE_RECEIPT_MESSAGE)
        return receipt_no

    def get_source_id(self, obj):
        if obj.member:
            return obj.member.member_id
        if obj.relative:
            return obj.relative.non_member_id
        return None

    def get_source_name(self, obj):
        if obj.member:
            return obj.member.name
        if obj.relative:
            return obj.relative.name
        return None

    def get_source_type(self, obj):
        if obj.member:
            return "Member"
        if obj.relative:
            return "Non-Member"
        return None


class AuctionTransactionSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    member_id = serializers.SerializerMethodField()
    non_member_id = serializers.CharField(source="relative.non_member_id", read_only=True, allow_null=True)
    source_id = serializers.SerializerMethodField()
    relative_name = serializers.CharField(source="relative.name", read_only=True)
    source_type = serializers.SerializerMethodField()
    native_place = serializers.SerializerMethodField()
    item_name = serializers.CharField(source="item.auction_item_name", read_only=True)
    receipt_no = serializers.CharField(source="receipt.receipt_no", read_only=True, allow_null=True)

    class Meta:
        model = AuctionTransaction
        fields = [
            "id",
            "member",
            "member_id",
            "non_member_id",
            "source_id",
            "member_name",
            "relative",
            "relative_name",
            "source_type",
            "name",
            "primary_phone_number",
            "native_place",
            "item",
            "item_name",
            "token_number",
            "price",
            "payment_status",
            "receipt",
            "receipt_no",
            "challan",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "member_id",
            "non_member_id",
            "source_id",
            "name",
            "primary_phone_number",
            "native_place",
            "item",
            "item_name",
        ]

    def get_fields(self):
        fields = super().get_fields()
        # During update operations, restrict to payment_status and receipt assignment only.
        if self.instance is not None:
            for field_name in fields:
                if field_name not in {"payment_status", "receipt"}:
                    fields[field_name].read_only = True
        return fields

    def get_member_name(self, obj):
        if obj.member:
            return obj.member.name
        if obj.relative:
            return obj.relative.name
        return None

    def get_member_id(self, obj):
        if obj.member:
            return obj.member.member_id
        return None

    def get_source_id(self, obj):
        if obj.member:
            return obj.member.member_id
        if obj.relative:
            return obj.relative.non_member_id
        return None

    def get_source_type(self, obj):
        return "Member" if obj.member else "Non-Member" if obj.relative else None

    def get_native_place(self, obj):
        if obj.member:
            return obj.member.native_place
        if obj.relative:
            return obj.relative.place
        return ""

    def _raise_as_drf_validation_error(self, error):
        detail = getattr(error, "message_dict", None) or getattr(error, "messages", None) or str(error)
        raise serializers.ValidationError(detail)

    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except DjangoValidationError as error:
            self._raise_as_drf_validation_error(error)

    def update(self, instance, validated_data):
        if "receipt" in validated_data and "payment_status" not in validated_data:
            validated_data["payment_status"] = (
                AuctionTransaction.PaymentStatus.PAID
                if validated_data["receipt"]
                else AuctionTransaction.PaymentStatus.UNPAID
            )
        try:
            return super().update(instance, validated_data)
        except DjangoValidationError as error:
            self._raise_as_drf_validation_error(error)


class RelativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Relative
        fields = "__all__"
        read_only_fields = ["non_member_id"]


class DepositSerializer(serializers.ModelSerializer):
    receipt_no = serializers.CharField(source="receipt.receipt_no", read_only=True)

    class Meta:
        model = Deposit
        fields = ["id", "receipt", "receipt_no", "amount", "date", "created_at", "updated_at"]


class AuctionItemSerializer(serializers.ModelSerializer):
    tokens = CommaSeparatedTokenField(read_only=True)
    used_tokens = CommaSeparatedTokenField(read_only=True)

    class Meta:
        model = AuctionItem
        fields = "__all__"
        read_only_fields = ["auction_item_name_tamil", "tokens", "used_tokens"]


class EelamEntrySerializer(serializers.ModelSerializer):
    source_name = serializers.SerializerMethodField()
    source_id = serializers.SerializerMethodField()

    class Meta:
        model = EelamEntry
        fields = [
            "id",
            "type",
            "member",
            "relative",
            "source_id",
            "source_name",
            "phone",
            "amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["phone"]

    def get_source_id(self, obj):
        if obj.member:
            return obj.member.member_id
        if obj.relative:
            return obj.relative.non_member_id
        return None

    def get_source_name(self, obj):
        if obj.member:
            return obj.member.name
        if obj.relative:
            return obj.relative.name
        return None


class DonationSerializer(serializers.ModelSerializer):
    source_name = serializers.SerializerMethodField()
    source_id = serializers.SerializerMethodField()

    class Meta:
        model = Donation
        fields = [
            "id",
            "donor_type",
            "member",
            "relative",
            "source_id",
            "source_name",
            "donor_name",
            "phone",
            "amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["donor_name", "phone"]

    def get_source_id(self, obj):
        if obj.member:
            return obj.member.member_id
        if obj.relative:
            return obj.relative.non_member_id
        return None

    def get_source_name(self, obj):
        if obj.member:
            return obj.member.name
        if obj.relative:
            return obj.relative.name
        return None


class DashboardSerializer(serializers.Serializer):
    total_auction_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid_auction_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_unpaid_auction_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_member_donations = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_non_member_donations = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_donations = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_members = serializers.IntegerField()
    total_receipts = serializers.IntegerField()


def apply_member_search(queryset, query):
    if not query:
        return queryset
    return queryset.filter(
        Q(member_id__icontains=query)
        | Q(primary_phone__icontains=query)
        | Q(secondary_phone__icontains=query)
        | Q(name__icontains=query)
    )


def build_dashboard_payload():
    aggregates = AuctionTransaction.objects.aggregate(
        total_auction_value=Sum("price"),
        total_paid_auction_value=Sum("price", filter=Q(payment_status=AuctionTransaction.PaymentStatus.PAID)),
        total_unpaid_auction_value=Sum("price", filter=Q(payment_status=AuctionTransaction.PaymentStatus.UNPAID)),
    )
    donation_aggregates = Donation.objects.aggregate(
        total_member_donations=Sum("amount", filter=Q(donor_type=Donation.DonorType.MEMBER)),
        total_non_member_donations=Sum("amount", filter=Q(donor_type=Donation.DonorType.NON_MEMBER)),
        total_donations=Sum("amount"),
    )
    return {
        "total_auction_value": aggregates["total_auction_value"] or 0,
        "total_paid_auction_value": aggregates["total_paid_auction_value"] or 0,
        "total_unpaid_auction_value": aggregates["total_unpaid_auction_value"] or 0,
        "total_member_donations": donation_aggregates["total_member_donations"] or 0,
        "total_non_member_donations": donation_aggregates["total_non_member_donations"] or 0,
        "total_donations": donation_aggregates["total_donations"] or 0,
        "total_members": Member.objects.count(),
        "total_receipts": Receipt.objects.count(),
    }
