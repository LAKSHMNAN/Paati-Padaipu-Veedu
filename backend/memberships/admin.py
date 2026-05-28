from django.contrib import admin

from .models import AuctionReport, AuctionTransaction, Deposit, Donation, EelamEntry, Member, Receipt, Relative


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("member_id", "name", "primary_phone", "native_place")
    search_fields = ("member_id", "name", "primary_phone", "secondary_phone")


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("receipt_no", "member", "relative", "phone_number")
    search_fields = ("receipt_no", "member__member_id", "relative__non_member_id", "phone_number")


@admin.register(AuctionTransaction)
class AuctionTransactionAdmin(admin.ModelAdmin):
    list_display = ("member", "relative", "item", "price", "payment_status", "receipt", "challan")
    search_fields = (
        "member__member_id",
        "relative__non_member_id",
        "relative__name",
        "relative__phone_1",
        "name",
        "primary_phone_number",
        "native_place",
        "item__auction_item_name",
        "receipt__receipt_no",
        "challan",
    )


@admin.register(AuctionReport)
class AuctionReportAdmin(admin.ModelAdmin):
    list_display = ("id", "report_status", "generated_at", "transaction_count", "total_amount")
    list_filter = ("report_status", "generated_at")
    search_fields = ("report_status",)
    readonly_fields = (
        "report_status",
        "generated_at",
        "transaction_count",
        "total_amount",
        "summary",
        "payment_status_breakdown",
        "transactions",
        "created_at",
        "updated_at",
    )


@admin.register(Relative)
class RelativeAdmin(admin.ModelAdmin):
    list_display = ("non_member_id", "name", "phone_1", "place", "type")
    search_fields = ("non_member_id", "name", "phone_1", "phone_2", "place")


@admin.register(Deposit)
class DepositAdmin(admin.ModelAdmin):
    list_display = ("receipt", "amount", "date")
    search_fields = ("receipt__receipt_no",)


@admin.register(EelamEntry)
class EelamEntryAdmin(admin.ModelAdmin):
    list_display = ("type", "member", "relative", "phone", "amount")
    search_fields = ("member__member_id", "relative__non_member_id", "relative__name", "phone")


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ("donor_type", "donor_name", "phone", "amount")
    search_fields = ("member__member_id", "member__name", "relative__non_member_id", "relative__name", "donor_name", "phone")
