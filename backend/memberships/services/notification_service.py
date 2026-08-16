import logging

from django.db import transaction
from django.utils import timezone

from memberships.models import AuctionTransaction, NotificationLog
from memberships.services.templates import build_payment_success_message
from memberships.services.whatsapp_service import normalize_phone_number, send_whatsapp_message


logger = logging.getLogger(__name__)
ACCEPTED_STATUS = "Accepted"


def get_transaction_recipient(auction_transaction):
    if auction_transaction.member:
        return auction_transaction.member.name, auction_transaction.member.primary_phone
    if auction_transaction.relative:
        return auction_transaction.relative.name, getattr(
            auction_transaction.relative,
            "primary_phone",
            auction_transaction.relative.phone_1,
        )
    return auction_transaction.name, auction_transaction.primary_phone_number


def has_payment_success_notification(auction_transaction):
    return NotificationLog.objects.filter(
        auction_transaction=auction_transaction,
        notification_type=NotificationLog.NotificationType.PAYMENT_SUCCESS,
        status__in=[
            NotificationLog.Status.PENDING,
            ACCEPTED_STATUS,
            NotificationLog.Status.SENT,
        ],
    ).exists()


def get_payment_template_parameters(auction_transaction):
    receipt_number = auction_transaction.receipt.receipt_no if auction_transaction.receipt else None
    return [
        auction_transaction.name,
        auction_transaction.item.auction_item_name,
        auction_transaction.token_number,
        round(auction_transaction.price or 0),
        receipt_number,
    ]


def validate_payment_notification_data(phone_number, template_parameters):
    errors = {}
    if not phone_number:
        errors["phone_number"] = "Recipient phone number is missing or invalid."

    parameter_names = ["member_name", "auction_item", "token_number", "amount", "receipt_number"]
    for name, value in zip(parameter_names, template_parameters):
        if value in (None, ""):
            errors[name] = "This template parameter is required."
    return errors


def create_failed_validation_log(auction_transaction, recipient_name, raw_phone_number, phone_number, message, errors):
    return NotificationLog.objects.create(
        auction_transaction=auction_transaction,
        recipient_name=recipient_name or "",
        phone_number=phone_number or str(raw_phone_number or ""),
        notification_type=NotificationLog.NotificationType.PAYMENT_SUCCESS,
        message=message,
        status=NotificationLog.Status.FAILED,
        response_json={
            "validation_errors": errors,
            "auction_transaction_id": auction_transaction.pk,
            "receipt_id": auction_transaction.receipt_id,
        },
    )


def send_payment_success_notification(auction_transaction_id):
    auction_transaction = (
        AuctionTransaction.objects.select_related("member", "relative", "item", "receipt")
        .filter(pk=auction_transaction_id)
        .first()
    )
    if not auction_transaction:
        logger.warning("Payment notification skipped; transaction %s not found", auction_transaction_id)
        return None

    if auction_transaction.payment_status != AuctionTransaction.PaymentStatus.PAID:
        logger.info("Payment notification skipped; transaction %s is not Paid", auction_transaction_id)
        return None

    if has_payment_success_notification(auction_transaction):
        logger.info("Payment notification skipped; transaction %s already has a log", auction_transaction_id)
        return None

    recipient_name, raw_phone_number = get_transaction_recipient(auction_transaction)
    phone_number = normalize_phone_number(raw_phone_number)
    message = build_payment_success_message(auction_transaction)
    template_parameters = get_payment_template_parameters(auction_transaction)
    validation_errors = validate_payment_notification_data(phone_number, template_parameters)
    if validation_errors:
        logger.warning(
            "Payment notification validation failed transaction=%s errors=%s",
            auction_transaction_id,
            validation_errors,
        )
        return create_failed_validation_log(
            auction_transaction,
            recipient_name,
            raw_phone_number,
            phone_number,
            message,
            validation_errors,
        )

    with transaction.atomic():
        if has_payment_success_notification(auction_transaction):
            logger.info("Payment notification skipped in lock; transaction %s already has a log", auction_transaction_id)
            return None
        notification_log = NotificationLog.objects.create(
            auction_transaction=auction_transaction,
            recipient_name=recipient_name or "",
            phone_number=phone_number or str(raw_phone_number or ""),
            notification_type=NotificationLog.NotificationType.PAYMENT_SUCCESS,
            message=message,
            status=NotificationLog.Status.PENDING,
        )

    result = send_whatsapp_message(
        phone_number,
        message,
        template_parameters=template_parameters,
    )
    notification_log.response_json = result.response_json
    notification_log.meta_message_id = result.meta_message_id
    if result.success:
        notification_log.status = ACCEPTED_STATUS
        notification_log.sent_at = timezone.now()
        notification_log.response_json.update(
            {
                "success_log": {
                    "recipient_phone": notification_log.phone_number,
                    "meta_message_id": result.meta_message_id,
                    "template_name": result.response_json.get("request", {})
                    .get("payload", {})
                    .get("template", {})
                    .get("name"),
                    "auction_transaction_id": auction_transaction.pk,
                    "receipt_id": auction_transaction.receipt_id,
                    "timestamp": timezone.now().isoformat(),
                }
            }
        )
    else:
        notification_log.status = NotificationLog.Status.FAILED
    notification_log.save(update_fields=["response_json", "meta_message_id", "status", "sent_at", "updated_at"])

    logger.info(
        "Payment notification completed transaction=%s recipient=%s status=%s http_status=%s",
        auction_transaction_id,
        notification_log.phone_number,
        notification_log.status,
        result.status_code,
    )
    return notification_log


def retry_failed_payment_success_notification(notification_log_id):
    failed_log = (
        NotificationLog.objects.select_related("auction_transaction")
        .filter(
            pk=notification_log_id,
            notification_type=NotificationLog.NotificationType.PAYMENT_SUCCESS,
            status=NotificationLog.Status.FAILED,
        )
        .first()
    )
    if not failed_log:
        logger.warning("Payment notification retry skipped; failed log %s not found", notification_log_id)
        return None

    auction_transaction = failed_log.auction_transaction
    if auction_transaction.payment_status != AuctionTransaction.PaymentStatus.PAID:
        logger.info("Payment notification retry skipped; transaction %s is not Paid", auction_transaction.pk)
        return None

    if NotificationLog.objects.filter(
        auction_transaction=auction_transaction,
        notification_type=NotificationLog.NotificationType.PAYMENT_SUCCESS,
        status__in=[ACCEPTED_STATUS, NotificationLog.Status.SENT],
    ).exists():
        logger.info("Payment notification retry skipped; transaction %s already accepted", auction_transaction.pk)
        return None

    template_parameters = get_payment_template_parameters(auction_transaction)
    validation_errors = validate_payment_notification_data(failed_log.phone_number, template_parameters)
    if validation_errors:
        failed_log.response_json = {
            "validation_errors": validation_errors,
            "auction_transaction_id": auction_transaction.pk,
            "receipt_id": auction_transaction.receipt_id,
        }
        failed_log.status = NotificationLog.Status.FAILED
        failed_log.save(update_fields=["response_json", "status", "updated_at"])
        return failed_log

    result = send_whatsapp_message(
        failed_log.phone_number,
        failed_log.message,
        template_parameters=template_parameters,
    )
    failed_log.response_json = result.response_json
    failed_log.meta_message_id = result.meta_message_id
    if result.success:
        failed_log.status = ACCEPTED_STATUS
        failed_log.sent_at = timezone.now()
    else:
        failed_log.status = NotificationLog.Status.FAILED
    failed_log.save(update_fields=["response_json", "meta_message_id", "status", "sent_at", "updated_at"])
    return failed_log
