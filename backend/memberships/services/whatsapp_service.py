import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib import error, request


logger = logging.getLogger(__name__)


@dataclass
class WhatsAppSendResult:
    success: bool
    status_code: int | None
    response_json: dict
    meta_message_id: str = ""
    error_message: str = ""


def normalize_phone_number(phone_number):
    digits = "".join(char for char in str(phone_number or "") if char.isdigit())
    if len(digits) == 10:
        return f"91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    return ""


def get_whatsapp_config():
    return {
        "access_token": os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip(),
        "phone_number_id": os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip(),
        "api_version": os.getenv("WHATSAPP_API_VERSION", "v25.0").strip() or "v25.0",
        "template_name": os.getenv("WHATSAPP_TEMPLATE_NAME", "hello_world").strip() or "hello_world",
        "template_language": os.getenv("WHATSAPP_TEMPLATE_LANGUAGE", "en_US").strip() or "en_US",
    }


def build_api_url(config):
    return f"https://graph.facebook.com/{config['api_version']}/{config['phone_number_id']}/messages"


def extract_meta_message_id(response_json):
    try:
        messages = response_json.get("messages") or []
        return str(messages[0].get("id") or "") if messages else ""
    except (AttributeError, IndexError, TypeError):
        return ""


def build_template_parameters(template_parameters):
    parameters = []
    for value in template_parameters or []:
        parameters.append({"type": "text", "text": str(value)})
    return parameters


def build_whatsapp_payload(recipient_number, config, template_parameters=None):
    payload = {
        "messaging_product": "whatsapp",
        "to": recipient_number,
        "type": "template",
        "template": {
            "name": config["template_name"],
            "language": {
                "code": config["template_language"],
            },
        },
    }
    parameters = [] if config["template_name"] == "hello_world" else build_template_parameters(template_parameters)
    if parameters:
        payload["template"]["components"] = [
            {
                "type": "body",
                "parameters": parameters,
            }
        ]
    return payload


def send_whatsapp_message(phone_number, message, timeout=15, template_parameters=None):
    recipient_number = normalize_phone_number(phone_number)
    timestamp = datetime.now(timezone.utc).isoformat()
    config = get_whatsapp_config()

    payload = build_whatsapp_payload(recipient_number, config, template_parameters)

    if not recipient_number:
        response_json = {
            "error": "Invalid phone number",
            "recipient": phone_number,
            "timestamp": timestamp,
        }
        logger.warning("WhatsApp invalid phone number: %s", response_json)
        return WhatsAppSendResult(False, None, response_json, error_message="Invalid phone number")

    missing_config = [key for key in ("access_token", "phone_number_id") if not config[key]]
    if missing_config:
        response_json = {
            "error": "Missing WhatsApp environment variables",
            "missing": missing_config,
            "timestamp": timestamp,
        }
        logger.error("WhatsApp config error: %s", response_json)
        return WhatsAppSendResult(False, None, response_json, error_message="Missing WhatsApp configuration")

    api_url = build_api_url(config)
    request_body = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {config['access_token']}",
        "Content-Type": "application/json",
    }
    safe_headers = {"Authorization": "Bearer ***", "Content-Type": headers["Content-Type"]}

    logger.warning("WhatsApp API URL: %s", api_url)
    logger.warning("WhatsApp headers: %s", safe_headers)
    logger.warning("WhatsApp payload:\n%s", json.dumps(payload, indent=4))

    http_request = request.Request(api_url, data=request_body, headers=headers, method="POST")
    try:
        with request.urlopen(http_request, timeout=timeout) as response:
            status_code = response.status
            raw_response = response.read().decode("utf-8")
            response_json = json.loads(raw_response) if raw_response else {}
            meta_message_id = extract_meta_message_id(response_json)
            logger.warning("WhatsApp status code: %s", status_code)
            logger.warning("WhatsApp response JSON:\n%s", json.dumps(response_json, indent=4))
            logger.warning("WhatsApp Meta message ID: %s", meta_message_id)
            return WhatsAppSendResult(
                success=200 <= status_code < 300,
                status_code=status_code,
                response_json={
                    "request": {
                        "url": api_url,
                        "headers": safe_headers,
                        "payload": payload,
                        "timestamp": timestamp,
                    },
                    "response": response_json,
                    "http_status": status_code,
                    "meta_message_id": meta_message_id,
                },
                meta_message_id=meta_message_id,
            )
    except error.HTTPError as exc:
        raw_response = exc.read().decode("utf-8", errors="replace")
        try:
            response_payload = json.loads(raw_response) if raw_response else {}
        except json.JSONDecodeError:
            response_payload = {"raw_response": raw_response}
        response_json = {
            "request": {
                "url": api_url,
                "headers": safe_headers,
                "payload": payload,
                "timestamp": timestamp,
            },
            "response": response_payload,
            "http_status": exc.code,
            "timestamp": timestamp,
        }
        logger.error(
            "WhatsApp HTTP error recipient=%s status=%s response=%s",
            recipient_number,
            exc.code,
            response_json,
        )
        return WhatsAppSendResult(False, exc.code, response_json, error_message=str(exc))
    except TimeoutError as exc:
        response_json = {"error": "Connection timeout", "timestamp": timestamp}
        logger.exception("WhatsApp timeout recipient=%s", recipient_number)
        return WhatsAppSendResult(False, None, response_json, error_message=str(exc))
    except error.URLError as exc:
        response_json = {"error": "Network error", "reason": str(exc.reason), "timestamp": timestamp}
        logger.exception("WhatsApp network error recipient=%s", recipient_number)
        return WhatsAppSendResult(False, None, response_json, error_message=str(exc))
    except Exception as exc:
        response_json = {"error": "Unexpected WhatsApp error", "detail": str(exc), "timestamp": timestamp}
        logger.exception("WhatsApp unexpected error recipient=%s", recipient_number)
        return WhatsAppSendResult(False, None, response_json, error_message=str(exc))
