from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    AuctionItem,
    AuctionItemToken,
    AuctionTransaction,
    Donation,
    EelamEntry,
    Member,
    Receipt,
    Registration,
    Relative,
)
from .views import AUTH_SESSION_KEY


class MembershipModelTests(TestCase):
    def setUp(self):
        self.member = Member.objects.create(
            member_id="M001",
            name="Arun Kumar",
            patta_name="Kumar",
            primary_phone="9876543210",
            secondary_phone="9123456789",
            address_line1="1 Main Street",
            address_line2="Area",
            address_line3="Landmark",
            city="Karaikudi",
            pincode="630001",
            native_place=Member.NativePlace.NERKUPPAI,
        )
        self.item = AuctionItem.objects.create(
            auction_item_name="Silver Lamp",
            quantity=2,
        )
        self.relative = Relative.objects.create(
            name="Guest One",
            phone_1="9011122233",
            type=Relative.RelativeType.GUEST,
        )
        self.admin_user = Registration.objects.create(
            username="admin_user",
            password_hash=make_password("admin-password"),
            is_admin=True,
        )

    def get_admin_client(self):
        client = APIClient()
        session = client.session
        session[AUTH_SESSION_KEY] = self.admin_user.id
        session.save()
        return client

    def test_duplicate_member_phone_is_rejected(self):
        with self.assertRaises(ValidationError):
            duplicate = Member(
                member_id="M002",
                name="Selvam",
                patta_name="S",
                primary_phone="9876543210",
                address_line1="2 Main Street",
                city="Madurai",
                pincode="625001",
                native_place=Member.NativePlace.VENDANPATTI,
            )
            duplicate.full_clean()

    def test_receipt_phone_must_match_member(self):
        with self.assertRaises(ValidationError):
            receipt = Receipt(receipt_no="R001", member=self.member, phone_number="9000000000")
            receipt.full_clean()

    def test_auction_item_auto_generates_tokens_from_quantity(self):
        self.assertEqual(self.item.auction_item_name, "Silver Lamp")
        self.assertEqual(self.item.tokens, [1, 2])
        self.assertEqual(self.item.used_tokens, [])
        self.assertEqual(
            list(
                AuctionItemToken.objects.filter(item=self.item)
                .order_by("token_number")
                .values_list("token_number", "auction_item_name", "used_token_number")
            ),
            [(1, "Silver Lamp", None), (2, "Silver Lamp", None)],
        )

    def test_auction_item_tokens_continue_globally_across_items(self):
        second_item = AuctionItem.objects.create(
            auction_item_name="Coconut",
            quantity=3,
        )

        self.assertEqual(second_item.tokens, [3, 4, 5])

    def test_auction_item_quantity_increase_appends_new_global_tokens(self):
        next_item = AuctionItem.objects.create(
            auction_item_name="Brass Lamp",
            quantity=1,
        )

        self.item.quantity = 4
        self.item.save()
        self.item.refresh_from_db()
        next_item.refresh_from_db()

        self.assertEqual(self.item.tokens, [1, 2, 4, 5])
        self.assertEqual(next_item.tokens, [3])

    def test_auction_item_quantity_cannot_be_reduced_after_generation(self):
        self.item.quantity = 1
        with self.assertRaises(ValidationError):
            self.item.save()

    @patch("memberships.models.GoogleTranslator.translate")
    def test_auction_item_uses_deep_translator_when_available(self, mocked_translate):
        mocked_translate.return_value = "தேங்காய்"
        AuctionItem.objects.filter(auction_item_name="Coconut").delete()
        item = AuctionItem.objects.create(
            auction_item_name="Coconut",
            quantity=1,
        )
        self.assertEqual(item.auction_item_name_tamil, "தேங்காய்")

    @patch("memberships.models.GoogleTranslator.translate")
    def test_auction_item_saves_tamil_translation(self, mocked_translate):
        mocked_translate.return_value = "விநாயக பானை"
        item = AuctionItem.objects.create(
            auction_item_name="Vinayaga paanai",
            quantity=1,
        )
        self.assertEqual(item.auction_item_name_tamil, "\u0bb5\u0bbf\u0ba8\u0bbe\u0baf\u0b95 \u0baa\u0bbe\u0ba9\u0bc8")

    @patch("memberships.models.GoogleTranslator.translate")
    def test_auction_item_returns_original_name_when_translation_service_fails(self, mocked_translate):
        mocked_translate.side_effect = RuntimeError("translation unavailable")
        item = AuctionItem.objects.create(
            auction_item_name="Fancy Gift Box",
            quantity=1,
        )
        self.assertEqual(item.auction_item_name_tamil, "Fancy Gift Box")

    def test_auction_item_updates_tamil_when_english_changes(self):
        self.item.auction_item_name = "Brass Lamp"
        self.item.save()
        self.item.refresh_from_db()
        self.assertEqual(
            self.item.auction_item_name_tamil,
            "\u0baa\u0bbf\u0ba4\u0bcd\u0ba4\u0bb3\u0bc8 \u0bb5\u0bbf\u0bb3\u0b95\u0bcd\u0b95\u0bc1",
        )

    def test_auction_transaction_receipt_member_must_match(self):
        receipt = Receipt.objects.create(receipt_no="R001", member=self.member, phone_number="9876543210")
        second_member = Member.objects.create(
            member_id="M003",
            name="Bala",
            patta_name="B",
            primary_phone="9988776655",
            address_line1="3 Main Street",
            city="Chennai",
            pincode="600001",
            native_place=Member.NativePlace.NERKUPPAI,
        )
        with self.assertRaises(ValidationError):
            txn = AuctionTransaction(
                member=second_member,
                token_number=1,
                payment_status=AuctionTransaction.PaymentStatus.UNPAID,
                receipt=receipt,
                price=Decimal("100.00"),
            )
            txn.full_clean()

    def test_auction_transaction_autofills_member_fields_and_item_from_token(self):
        receipt = Receipt.objects.create(receipt_no="R002", member=self.member, phone_number="9876543210")
        txn = AuctionTransaction.objects.create(
            member=self.member,
            token_number=1,
            price=Decimal("1500.00"),
            payment_status=AuctionTransaction.PaymentStatus.PAID,
            receipt=receipt,
            challan="CH-1001",
        )
        self.assertEqual(txn.item, self.item)
        self.assertEqual(txn.name, self.member.name)
        self.assertEqual(txn.primary_phone_number, self.member.primary_phone)
        self.assertEqual(txn.native_place, self.member.native_place)

    def test_auction_transaction_supports_non_member_relative(self):
        txn = AuctionTransaction.objects.create(
            relative=self.relative,
            token_number=1,
            price=Decimal("700.00"),
            payment_status=AuctionTransaction.PaymentStatus.PAID,
            challan="CH-2001",
        )
        self.assertEqual(txn.item, self.item)
        self.assertIsNone(txn.member)
        self.assertEqual(txn.relative, self.relative)
        self.assertEqual(txn.name, self.relative.name)
        self.assertEqual(txn.primary_phone_number, self.relative.phone_1)

    def test_auction_transaction_invalid_token_is_rejected(self):
        with self.assertRaises(ValidationError):
            txn = AuctionTransaction(
                member=self.member,
                token_number=999,
                price=Decimal("100.00"),
                payment_status=AuctionTransaction.PaymentStatus.PAID,
            )
            txn.full_clean()

    def test_auction_transaction_marks_token_as_used(self):
        AuctionTransaction.objects.create(
            member=self.member,
            token_number=1,
            price=Decimal("100.00"),
            payment_status=AuctionTransaction.PaymentStatus.PAID,
        )

        self.item.refresh_from_db()
        self.assertEqual(self.item.used_tokens, [1])
        token_entry = AuctionItemToken.objects.get(token_number=1)
        self.assertEqual(token_entry.auction_item_name, "Silver Lamp")
        self.assertEqual(token_entry.used_token_number, 1)

    def test_auction_transaction_delete_releases_token(self):
        txn = AuctionTransaction.objects.create(
            member=self.member,
            token_number=1,
            price=Decimal("100.00"),
            payment_status=AuctionTransaction.PaymentStatus.PAID,
        )

        txn.delete()
        self.item.refresh_from_db()
        self.assertEqual(self.item.used_tokens, [])
        self.assertIsNone(AuctionItemToken.objects.get(token_number=1).used_token_number)

    def test_auction_transaction_update_moves_used_token(self):
        txn = AuctionTransaction.objects.create(
            member=self.member,
            token_number=1,
            price=Decimal("100.00"),
            payment_status=AuctionTransaction.PaymentStatus.PAID,
        )

        txn.token_number = 2
        txn.save()

        self.item.refresh_from_db()
        self.assertEqual(self.item.used_tokens, [2])

    def test_auction_transaction_api_allows_receipt_for_non_member(self):
        client = APIClient()
        receipt = Receipt.objects.create(receipt_no="R003", member=self.member, phone_number="9876543210")
        response = client.post(
            "/api/auction-transactions/",
            {
                "relative": self.relative.id,
                "token_number": 1,
                "price": "300.00",
                "payment_status": AuctionTransaction.PaymentStatus.PAID,
                "receipt": receipt.receipt_no,
                "challan": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["receipt"], receipt.receipt_no)
        self.assertEqual(response.json()["source_type"], "Non-Member")

    def test_auction_transaction_api_returns_json_validation_error_when_token_used(self):
        client = APIClient()
        second_member = Member.objects.create(
            member_id="M004",
            name="Dinesh",
            patta_name="D",
            primary_phone="9012345678",
            address_line1="4 Main Street",
            city="Trichy",
            pincode="620001",
            native_place=Member.NativePlace.NERKUPPAI,
        )
        AuctionTransaction.objects.create(
            member=self.member,
            token_number=1,
            price=Decimal("100.00"),
            payment_status=AuctionTransaction.PaymentStatus.PAID,
        )

        response = client.post(
            "/api/auction-transactions/",
            {
                "member": second_member.member_id,
                "token_number": 1,
                "price": "300.00",
                "payment_status": AuctionTransaction.PaymentStatus.PAID,
                "receipt": None,
                "challan": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertIn("token_number", response.json())
        self.assertEqual(response.json()["token_number"][0], "Token already used")

    def test_auction_transaction_api_returns_json_validation_error_when_token_invalid(self):
        client = APIClient()
        response = client.post(
            "/api/auction-transactions/",
            {
                "member": self.member.member_id,
                "token_number": 60,
                "price": "300.00",
                "payment_status": AuctionTransaction.PaymentStatus.PAID,
                "receipt": None,
                "challan": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["token_number"][0], "Invalid token number")

    def test_auction_item_delete_returns_json_error_when_transaction_exists(self):
        client = self.get_admin_client()
        AuctionTransaction.objects.create(
            member=self.member,
            token_number=1,
            price=Decimal("100.00"),
            payment_status=AuctionTransaction.PaymentStatus.PAID,
        )

        response = client.delete(f"/api/auction-items/{self.item.id}/")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Cannot delete this auction item because it is already used in auction transactions.",
        )

    def test_auction_item_api_generates_tokens_from_quantity(self):
        client = self.get_admin_client()
        response = client.post(
            "/api/auction-items/",
            {
                "auction_item_name": "Coconut",
                "quantity": 3,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["tokens"], "3,4,5")
        self.assertEqual(response.json()["used_tokens"], "")

    def test_auction_item_translation_api_returns_tamil_name(self):
        client = self.get_admin_client()
        response = client.post(
            "/api/auction-items/translate/",
            {
                "auction_item_name": "Vinayaga paanai",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["auction_item_name_tamil"],
            "\u0bb5\u0bbf\u0ba8\u0bbe\u0baf\u0b95 \u0baa\u0bbe\u0ba9\u0bc8",
        )

    def test_normal_user_cannot_access_admin_modules(self):
        normal_user = Registration.objects.create(
            username="normal_user",
            password_hash=make_password("normal-password"),
            is_admin=False,
        )
        client = APIClient()
        session = client.session
        session[AUTH_SESSION_KEY] = normal_user.id
        session.save()

        member_response = client.get("/api/members/")
        auction_item_response = client.get("/api/auction-items/")

        self.assertEqual(member_response.status_code, 403)
        self.assertEqual(auction_item_response.status_code, 403)

    def test_member_donation_autofills_member_details(self):
        donation = Donation.objects.create(
            donor_type=Donation.DonorType.MEMBER,
            member=self.member,
            amount=Decimal("500.00"),
        )
        self.assertEqual(donation.donor_name, self.member.name)
        self.assertEqual(donation.phone, self.member.primary_phone)

    def test_non_member_donation_requires_relative(self):
        with self.assertRaises(ValidationError):
            donation = Donation(
                donor_type=Donation.DonorType.NON_MEMBER,
                amount=Decimal("250.00"),
            )
            donation.full_clean()

    def test_eelam_non_member_requires_relative(self):
        with self.assertRaises(ValidationError):
            entry = EelamEntry(type=EelamEntry.EntryType.NON_MEMBER, amount=Decimal("300.00"))
            entry.full_clean()

    def test_relative_phone_cannot_duplicate_member_phone(self):
        with self.assertRaises(ValidationError):
            relative = Relative(name="Guest One", phone_1="9876543210", type=Relative.RelativeType.GUEST)
            relative.full_clean()
