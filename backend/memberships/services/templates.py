def build_payment_success_message(transaction):
    receipt_number = transaction.receipt.receipt_no if transaction.receipt else "-"
    amount = round(transaction.price or 0)
    return (
        "\U0001f64f Shri Udayammai Paati Padaippu Veedu\n\n"
        f"Dear {transaction.name},\n\n"
        "Your auction payment has been received successfully.\n\n"
        "Auction Item:\n"
        f"{transaction.item.auction_item_name}\n\n"
        "Token Number:\n"
        f"{transaction.token_number}\n\n"
        "Amount Paid:\n"
        f"\u20b9{amount}\n\n"
        "Receipt Number:\n"
        f"{receipt_number}\n\n"
        "Payment Status:\n"
        "Paid \u2705\n\n"
        "Thank you for your participation."
    )
