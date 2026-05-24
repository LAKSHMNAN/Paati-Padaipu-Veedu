# Member Management & Donation Tracking System Schema

## Core tables
- `members`: source of truth for all member-linked modules.
- `receipts`: linked to a valid member and validated against member phone.
- `auction_transaction`: member-linked auction transactions with item, price, payment status, receipt, and challan details.
- `relatives`: non-member contacts with controlled types.
- `deposits`: bank/deposit records tied to receipts.
- `eelam_entries`: combined ledger for member and non-member contributions.

## Validation rules
- No auction transaction without an existing member.
- No receipt without an existing member.
- Receipt phone must match the selected member.
- Duplicate phones are blocked across members and relatives.
- Duplicate receipt numbers are blocked by primary key.
- Auction transaction price is sourced from the selected auction item.
- If a receipt is selected for an auction transaction, it must belong to the selected member.
- Eelam member/non-member rows must use the correct relation.
