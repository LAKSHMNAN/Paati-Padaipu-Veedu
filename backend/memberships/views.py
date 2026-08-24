from django.contrib.auth.hashers import check_password
from django.http import JsonResponse
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.db.models import Q
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import ValidationError
from rest_framework import mixins, serializers, status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    AuctionItem,
    AuctionTransaction,
    Deposit,
    Donation,
    EelamEntry,
    Invoice,
    Login,
    Member,
    Receipt,
    Registration,
    Relative,
    translate_auction_item_name_to_tamil,
)
from .serializers import (
    AuctionItemSerializer,
    AuctionTransactionSerializer,
    DashboardSerializer,
    DepositSerializer,
    DonationSerializer,
    EelamEntrySerializer,
    InvoiceSerializer,
    LoginSerializer,
    MemberSerializer,
    ReceiptSerializer,
    RegistrationSerializer,
    RegisterSerializer,
    RelativeSerializer,
    apply_member_search,
    build_dashboard_payload,
)
from .year_utils import filter_queryset_by_year, get_request_record_year


AUTH_SESSION_KEY = "registration_id"


class EmptySerializer(serializers.Serializer):
    pass


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(GenericAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.save()
        return Response(
            {
                "message": "Registration successful. Please login.",
                "user": RegistrationSerializer(account).data,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        account = Registration.objects.filter(
            username__iexact=username,
            is_active=True,
        ).first()
        ip_address = get_client_ip(request)
        if account is None:
            Login.objects.create(
                username=username,
                is_successful=False,
                failure_reason="Invalid username or password.",
                ip_address=ip_address,
            )
            raise ValidationError({"detail": "Invalid username or password."})
        if not check_password(password, account.password_hash):
            Login.objects.create(
                registration=account,
                username=username,
                is_successful=False,
                failure_reason="Invalid username or password.",
                ip_address=ip_address,
            )
            raise ValidationError({"detail": "Invalid username or password."})
        account.mark_logged_in()
        Login.objects.create(
            registration=account,
            username=account.username,
            is_successful=True,
            ip_address=ip_address,
        )
        request.session[AUTH_SESSION_KEY] = account.id
        request.session.set_expiry(0)
        return Response({"user": RegistrationSerializer(account).data}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(GenericAPIView):
    serializer_class = EmptySerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        request.session.pop(AUTH_SESSION_KEY, None)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(GenericAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        account_id = request.session.get(AUTH_SESSION_KEY)
        account = Registration.objects.filter(id=account_id, is_active=True).first()
        if account is None:
            return Response({"user": None}, status=status.HTTP_200_OK)
        return Response({"user": RegistrationSerializer(account).data}, status=status.HTTP_200_OK)


class BaseListCreateView(mixins.ListModelMixin, mixins.CreateModelMixin, GenericAPIView):
    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return filter_queryset_by_year(queryset, get_request_record_year(self.request))

    def perform_create(self, serializer):
        year = get_request_record_year(self.request)
        if year is not None and "record_year" in {field.name for field in serializer.Meta.model._meta.fields}:
            serializer.save(record_year=year)
            return
        serializer.save()

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class BaseDetailView(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, GenericAPIView):
    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return filter_queryset_by_year(queryset, get_request_record_year(self.request))

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as error:
            protected_objects = list(error.protected_objects)
            if protected_objects and instance.__class__.__name__ == "AuctionItem":
                raise ValidationError(
                    {
                        "detail": "Cannot delete this auction item because it is already used in auction transactions."
                    }
                )
            raise ValidationError(
                {"detail": "Cannot delete this record because it is referenced by other records."}
            )


class AdminOnlyMixin:
    def dispatch(self, request, *args, **kwargs):
        account_id = request.session.get(AUTH_SESSION_KEY)
        account = Registration.objects.filter(id=account_id, is_active=True, is_admin=True).first()
        if account is None:
            return JsonResponse({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        return super().dispatch(request, *args, **kwargs)


class MemberListCreateView(BaseListCreateView):
    serializer_class = MemberSerializer

    def get_queryset(self):
        return apply_member_search(Member.objects.all(), self.request.query_params.get("search"))

    def post(self, request, *args, **kwargs):
        account_id = request.session.get(AUTH_SESSION_KEY)
        account = Registration.objects.filter(id=account_id, is_active=True, is_admin=True).first()
        if account is None:
            return JsonResponse({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        return super().post(request, *args, **kwargs)


class MemberDetailView(AdminOnlyMixin, BaseDetailView):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    lookup_field = "member_id"


class ReceiptListCreateView(BaseListCreateView):
    serializer_class = ReceiptSerializer

    def get_queryset(self):
        queryset = Receipt.objects.select_related("member", "relative").all()
        query = self.request.query_params.get("search")
        if not query:
            return queryset
        return queryset.filter(
            Q(receipt_no__icontains=query)
            | Q(member__member_id__icontains=query)
            | Q(member__name__icontains=query)
            | Q(relative__non_member_id__icontains=query)
            | Q(relative__name__icontains=query)
            | Q(phone_number__icontains=query)
        )


class ReceiptDetailView(BaseDetailView):
    queryset = Receipt.objects.select_related("member", "relative").all()
    serializer_class = ReceiptSerializer
    lookup_field = "receipt_no"


class AuctionTransactionListCreateView(BaseListCreateView):
    serializer_class = AuctionTransactionSerializer

    def get_queryset(self):
        queryset = AuctionTransaction.objects.select_related("member", "relative", "item", "receipt", "invoice").all()
        query = self.request.query_params.get("search")
        if not query:
            return queryset
        return queryset.filter(
            Q(member__member_id__icontains=query)
            | Q(relative__non_member_id__icontains=query)
            | Q(relative__name__icontains=query)
            | Q(relative__phone_1__icontains=query)
            | Q(relative__place__icontains=query)
            | Q(member__primary_phone__icontains=query)
            | Q(member__native_place__icontains=query)
            | Q(primary_phone_number__icontains=query)
            | Q(native_place__icontains=query)
            | Q(token_number__icontains=query)
            | Q(item__auction_item_name__icontains=query)
            | Q(receipt__receipt_no__icontains=query)
            | Q(challan__icontains=query)
            | Q(payment_status__icontains=query)
            | Q(name__icontains=query)
        )


class AuctionTransactionDetailView(BaseDetailView):
    queryset = AuctionTransaction.objects.select_related("member", "relative", "item", "receipt", "invoice").all()
    serializer_class = AuctionTransactionSerializer


@method_decorator(csrf_exempt, name="dispatch")
class AuctionTransactionInvoiceGenerateView(GenericAPIView):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Invoice.objects.none()
        return Invoice.objects.select_related("auction_transaction").all()

    def post(self, request, pk, *args, **kwargs):
        selected_year = get_request_record_year(request)
        with transaction.atomic():
            queryset = AuctionTransaction.objects.select_for_update().select_related(
                "member",
                "relative",
                "item",
                "receipt",
                "invoice",
            )
            queryset = filter_queryset_by_year(queryset, selected_year)
            auction_transaction = queryset.filter(pk=pk).first()
            if auction_transaction is None:
                return Response({"detail": "Auction transaction not found for the selected year."}, status=404)

            existing_invoice = getattr(auction_transaction, "invoice", None)
            if existing_invoice is not None:
                return Response(self.get_serializer(existing_invoice).data, status=status.HTTP_200_OK)

            if auction_transaction.payment_status != AuctionTransaction.PaymentStatus.UNPAID:
                return Response(
                    {"detail": "Invoice can only be generated for an unpaid auction transaction."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            invoice = Invoice.objects.create(
                auction_transaction=auction_transaction,
                amount=auction_transaction.price,
                record_year=auction_transaction.record_year,
            )
            return Response(self.get_serializer(invoice).data, status=status.HTTP_201_CREATED)


class RelativeListCreateView(BaseListCreateView):
    serializer_class = RelativeSerializer

    def get_queryset(self):
        queryset = Relative.objects.all()
        query = self.request.query_params.get("search")
        if not query:
            return queryset
        return queryset.filter(
            Q(non_member_id__icontains=query)
            | Q(name__icontains=query)
            | Q(phone_1__icontains=query)
            | Q(phone_2__icontains=query)
            | Q(place__icontains=query)
            | Q(type__icontains=query)
        )


class RelativeDetailView(BaseDetailView):
    queryset = Relative.objects.all()
    serializer_class = RelativeSerializer


class DepositListCreateView(BaseListCreateView):
    serializer_class = DepositSerializer

    def get_queryset(self):
        queryset = Deposit.objects.select_related("receipt").all()
        query = self.request.query_params.get("search")
        if not query:
            return queryset
        return queryset.filter(Q(receipt__receipt_no__icontains=query))


class DepositDetailView(BaseDetailView):
    queryset = Deposit.objects.select_related("receipt").all()
    serializer_class = DepositSerializer


class AuctionItemListCreateView(AdminOnlyMixin, BaseListCreateView):
    serializer_class = AuctionItemSerializer

    def get_queryset(self):
        queryset = AuctionItem.objects.all()
        query = self.request.query_params.get("search")
        if not query:
            return queryset
        return queryset.filter(
            Q(auction_item_name__icontains=query)
            | Q(auction_item_name_tamil__icontains=query)
            | Q(tokens__icontains=query)
            | Q(used_tokens__icontains=query)
        )


class AuctionItemDetailView(AdminOnlyMixin, BaseDetailView):
    queryset = AuctionItem.objects.all()
    serializer_class = AuctionItemSerializer


class AuctionItemTranslationView(AdminOnlyMixin, GenericAPIView):
    class InputSerializer(serializers.Serializer):
        auction_item_name = serializers.CharField(allow_blank=True, trim_whitespace=True)

    serializer_class = InputSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        auction_item_name = serializer.validated_data["auction_item_name"]
        return Response(
            {
                "auction_item_name": auction_item_name,
                "auction_item_name_tamil": translate_auction_item_name_to_tamil(auction_item_name),
            },
            status=status.HTTP_200_OK,
        )


class EelamListCreateView(BaseListCreateView):
    serializer_class = EelamEntrySerializer

    def get_queryset(self):
        queryset = EelamEntry.objects.select_related("member", "relative").all()
        query = self.request.query_params.get("search")
        if not query:
            return queryset
        return queryset.filter(
            Q(member__member_id__icontains=query)
            | Q(member__primary_phone__icontains=query)
            | Q(relative__non_member_id__icontains=query)
            | Q(relative__phone_1__icontains=query)
            | Q(phone__icontains=query)
            | Q(relative__name__icontains=query)
        )


class EelamDetailView(BaseDetailView):
    queryset = EelamEntry.objects.select_related("member", "relative").all()
    serializer_class = EelamEntrySerializer


class DonationListCreateView(BaseListCreateView):
    serializer_class = DonationSerializer

    def get_queryset(self):
        queryset = Donation.objects.select_related("member", "relative").all()
        query = self.request.query_params.get("search")
        if not query:
            return queryset
        return queryset.filter(
            Q(donor_type__icontains=query)
            | Q(member__member_id__icontains=query)
            | Q(member__name__icontains=query)
            | Q(relative__non_member_id__icontains=query)
            | Q(relative__name__icontains=query)
            | Q(donor_name__icontains=query)
            | Q(phone__icontains=query)
        )


class DonationDetailView(BaseDetailView):
    queryset = Donation.objects.select_related("member", "relative").all()
    serializer_class = DonationSerializer


class DashboardView(GenericAPIView):
    serializer_class = DashboardSerializer

    def get(self, request, *args, **kwargs):
        serializer = self.get_serializer(build_dashboard_payload(get_request_record_year(request)))
        return Response(serializer.data, status=status.HTTP_200_OK)
