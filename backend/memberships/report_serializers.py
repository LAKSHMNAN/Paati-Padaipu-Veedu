from rest_framework import serializers
from django.db.models import Sum, Count, Q
from decimal import Decimal
from .models import AuctionTransaction


class AuctionTransactionSummarySerializer(serializers.Serializer):
    """Serializer for auction transaction summary report."""
    
    total_transactions = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_unpaid_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_count = serializers.IntegerField()
    unpaid_count = serializers.IntegerField()
    paid_percentage = serializers.FloatField()
    unpaid_percentage = serializers.FloatField()
    average_transaction_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    report_date = serializers.DateTimeField()


class AuctionTransactionDetailReportSerializer(serializers.ModelSerializer):
    """Serializer for detailed auction transaction report."""
    
    source_id = serializers.SerializerMethodField()
    member_name = serializers.CharField(source="member.name", read_only=True, allow_null=True)
    relative_name = serializers.CharField(source="relative.name", read_only=True, allow_null=True)
    non_member_id = serializers.CharField(source="relative.non_member_id", read_only=True, allow_null=True)
    item_name = serializers.CharField(source="item.auction_item_name", read_only=True)
    receipt_no = serializers.CharField(source="receipt.receipt_no", read_only=True, allow_null=True)
    receipt_date = serializers.DateField(source="receipt.receipt_date", read_only=True, allow_null=True)
    source_type = serializers.SerializerMethodField()

    class Meta:
        model = AuctionTransaction
        fields = [
            "id",
            "source_id",
            "member_name",
            "relative_name",
            "non_member_id",
            "source_type",
            "item_name",
            "token_number",
            "price",
            "payment_status",
            "receipt_no",
            "receipt_date",
            "created_at",
        ]

    def get_source_type(self, obj):
        return "Member" if obj.member else "Non-Member"

    def get_source_id(self, obj):
        if obj.member:
            return obj.member.member_id
        if obj.relative:
            return obj.relative.non_member_id
        return None


class PaymentStatusBreakdownSerializer(serializers.Serializer):
    """Serializer for payment status breakdown."""
    
    payment_status = serializers.CharField()
    count = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    percentage = serializers.FloatField()


class AuctionTransactionReportDataSerializer(serializers.Serializer):
    """Complete report data with summary and breakdown."""
    
    summary = AuctionTransactionSummarySerializer()
    payment_status_breakdown = PaymentStatusBreakdownSerializer(many=True)
    transactions = AuctionTransactionDetailReportSerializer(many=True)
