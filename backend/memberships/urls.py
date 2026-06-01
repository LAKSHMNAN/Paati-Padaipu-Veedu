from django.urls import path
from rest_framework.urlpatterns import format_suffix_patterns

from .views import (
    AuctionItemDetailView,
    AuctionItemListCreateView,
    AuctionItemTranslationView,
    DashboardView,
    DepositDetailView,
    DepositListCreateView,
    DonationDetailView,
    DonationListCreateView,
    EelamDetailView,
    EelamListCreateView,
    MemberDetailView,
    MemberListCreateView,
    ReceiptDetailView,
    ReceiptListCreateView,
    RelativeDetailView,
    RelativeListCreateView,
    AuctionTransactionDetailView,
    AuctionTransactionListCreateView,
    CurrentUserView,
    LoginView,
    LogoutView,
    RegisterView,
)
from .report_views import (
    AuctionTransactionReportView,
    AuctionTransactionByItemReportView,
    AuctionTransactionItemDetailView,
    PaidAuctionTransactionReportView,
    UnpaidAuctionTransactionReportView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", CurrentUserView.as_view(), name="auth-me"),
    path("members/", MemberListCreateView.as_view(), name="member-list"),
    path("members/<str:member_id>/", MemberDetailView.as_view(), name="member-detail"),
    path("receipts/", ReceiptListCreateView.as_view(), name="receipt-list"),
    path("receipts/<str:receipt_no>/", ReceiptDetailView.as_view(), name="receipt-detail"),
    path("auction-transactions/", AuctionTransactionListCreateView.as_view(), name="auction-transaction-list"),
    path("auction-transactions/<int:pk>/", AuctionTransactionDetailView.as_view(), name="auction-transaction-detail"),
    path("transactions/", AuctionTransactionListCreateView.as_view(), name="transaction-list"),
    path("transactions/<int:pk>/", AuctionTransactionDetailView.as_view(), name="transaction-detail"),
    path("relatives/", RelativeListCreateView.as_view(), name="relative-list"),
    path("relatives/<int:pk>/", RelativeDetailView.as_view(), name="relative-detail"),
    path("deposits/", DepositListCreateView.as_view(), name="deposit-list"),
    path("deposits/<int:pk>/", DepositDetailView.as_view(), name="deposit-detail"),
    path("auction-items/", AuctionItemListCreateView.as_view(), name="auction-item-list"),
    path("auction-items/translate/", AuctionItemTranslationView.as_view(), name="auction-item-translate"),
    path("auction-items/<int:pk>/", AuctionItemDetailView.as_view(), name="auction-item-detail"),
    path("eelam/", EelamListCreateView.as_view(), name="eelam-list"),
    path("eelam/<int:pk>/", EelamDetailView.as_view(), name="eelam-detail"),
    path("donations/", DonationListCreateView.as_view(), name="donation-list"),
    path("donations/<int:pk>/", DonationDetailView.as_view(), name="donation-detail"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("reports/auction-transactions/", AuctionTransactionReportView.as_view(), name="auction-transaction-report"),
    path(
        "reports/auction-transactions/paid/",
        PaidAuctionTransactionReportView.as_view(),
        name="paid-auction-transaction-report",
    ),
    path(
        "reports/auction-transactions/unpaid/",
        UnpaidAuctionTransactionReportView.as_view(),
        name="unpaid-auction-transaction-report",
    ),
    path(
        "reports/auction-transactions/by-item/",
        AuctionTransactionByItemReportView.as_view(),
        name="auction-transaction-by-item-report",
    ),
    path(
        "reports/auction-transactions/by-item/<int:item_id>/",
        AuctionTransactionItemDetailView.as_view(),
        name="auction-transaction-item-detail",
    ),
]

urlpatterns = format_suffix_patterns(urlpatterns)
