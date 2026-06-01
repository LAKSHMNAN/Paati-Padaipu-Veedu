# Auction Transaction Reports Module

## Overview

The Report Module provides comprehensive reporting functionality for Auction Transactions. It generates detailed reports with payment status breakdowns and can export in multiple formats.

## Features

- **Summary Statistics**: Total transactions, amounts, payment status counts
- **Payment Status Breakdown**: Detailed breakdown of Paid vs Unpaid transactions
- **Detailed Transactions List**: Complete transaction details
- **Multiple Export Formats**: JSON, CSV, Excel (XLSX), and PDF
- **Real-time Calculations**: Automatically calculates percentages and averages

## API Endpoints

### Base Endpoint
```
GET /api/reports/auction-transactions/
```

### Query Parameters

#### Format Parameter
```
?format=<format_type>
```

Supported formats:
- `json` (default) - Returns JSON response
- `csv` - Downloads CSV file
- `excel` - Downloads XLSX file  
- `pdf` - Downloads PDF file

## Usage Examples

### 1. JSON Report (Default)
```bash
curl "http://127.0.0.1:8000/api/reports/auction-transactions/"
```

Response:
```json
{
  "summary": {
    "total_transactions": 50,
    "total_amount": "49999.99",
    "total_paid_amount": "35000.00",
    "total_unpaid_amount": "14999.99",
    "paid_count": 35,
    "unpaid_count": 15,
    "paid_percentage": 70.0,
    "unpaid_percentage": 30.0,
    "average_transaction_amount": "999.99",
    "report_date": "2026-05-03T10:30:00Z"
  },
  "payment_status_breakdown": [
    {
      "payment_status": "Paid",
      "count": 35,
      "total_amount": "35000.00",
      "percentage": 70.0
    },
    {
      "payment_status": "Unpaid",
      "count": 15,
      "total_amount": "14999.99",
      "percentage": 30.0
    }
  ],
  "transactions": [
    {
      "id": 1,
      "member_name": "John Doe",
      "relative_name": null,
      "source_type": "Member",
      "item_name": "Vinayaga paanai",
      "token_number": 3,
      "price": "99.98",
      "payment_status": "Paid",
      "challan": "-",
      "created_at": "2026-05-01T10:00:00Z"
    }
    // ... more transactions
  ]
}
```

### 2. CSV Report
```bash
curl "http://127.0.0.1:8000/api/reports/auction-transactions/?format=csv" -O
```

Downloads `auction_transaction_report.csv` with:
- Summary section with all statistics
- Payment status breakdown table
- Detailed transactions list

### 3. Excel Report
```bash
curl "http://127.0.0.1:8000/api/reports/auction-transactions/?format=excel" -O
```

Downloads `auction_transaction_report.xlsx` with:
- Multiple worksheets (or formatted sections)
- Colored headers and formatting
- Proper column widths
- Professional layout

### 4. PDF Report
```bash
curl "http://127.0.0.1:8000/api/reports/auction-transactions/?format=pdf" -O
```

Downloads `auction_transaction_report.pdf` with:
- Formatted title and date
- Summary statistics table
- Payment breakdown table
- Professional PDF styling

## Report Data Structure

### Summary Section
```
- Total Transactions: Count of all auction transactions
- Total Amount: Sum of all transaction prices
- Paid Amount: Sum of prices for "Paid" transactions
- Unpaid Amount: Sum of prices for "Unpaid" transactions
- Paid Count: Number of paid transactions
- Unpaid Count: Number of unpaid transactions
- Paid Percentage: (Paid Count / Total) * 100
- Unpaid Percentage: (Unpaid Count / Total) * 100
- Average Transaction Amount: Total Amount / Total Transactions
- Report Date: Current timestamp
```

### Payment Status Breakdown
```
For each payment status (Paid, Unpaid):
- Payment Status: Status value
- Count: Number of transactions with this status
- Total Amount: Sum of prices for this status
- Percentage: (Count / Total) * 100
```

### Detailed Transactions
```
For each transaction:
- ID: Transaction ID
- Member/Non-Member Name: Name of member or relative
- Source Type: "Member" or "Non-Member"
- Item: Auction item name
- Token Number: Token number
- Price: Transaction price
- Payment Status: Paid/Unpaid
- Challan: Challan number (if any)
- Date: Transaction creation date
```

## Installation

### 1. Install Required Dependencies

```bash
pip install -r requirements.txt
```

The report module requires:
- `openpyxl==3.10.7` - For Excel file generation
- `reportlab==4.0.7` - For PDF file generation

### 2. Verify Installation

```bash
# Test JSON report
python manage.py shell
from memberships.report_views import AuctionTransactionReportView
```

## Frontend Integration

### JavaScript Example
```javascript
// Fetch JSON report
const response = await fetch('http://127.0.0.1:8000/api/reports/auction-transactions/');
const report = await response.json();
console.log(report.summary);

// Download CSV
window.location.href = 'http://127.0.0.1:8000/api/reports/auction-transactions/?format=csv';

// Download Excel
window.location.href = 'http://127.0.0.1:8000/api/reports/auction-transactions/?format=excel';

// Download PDF
window.location.href = 'http://127.0.0.1:8000/api/reports/auction-transactions/?format=pdf';
```

## Error Handling

### Invalid Format
```bash
curl "http://127.0.0.1:8000/api/reports/auction-transactions/?format=invalid"
```

Response (400 Bad Request):
```json
{
  "error": "Invalid format. Supported formats: json, csv, pdf, excel"
}
```

### Missing Dependencies
If `openpyxl` or `reportlab` is not installed and you try to export:

```json
{
  "error": "openpyxl not installed. Install with: pip install openpyxl"
}
```

or

```json
{
  "error": "reportlab not installed. Install with: pip install reportlab"
}
```

## Performance Notes

- Reports are generated on-the-fly (not cached)
- For large datasets (10,000+ transactions), JSON format performs best
- CSV and Excel formats include full transaction details
- PDF generation may be slower due to formatting

## Future Enhancements

Potential additions to the report module:
- Date range filtering
- Member/Non-member specific reports
- Item-wise reports
- Custom report templates
- Scheduled report generation and email delivery
- Report caching for frequently accessed reports
- Export to Google Sheets / Cloud Storage

## Files Modified/Created

1. `memberships/report_serializers.py` - New serializers for report data
2. `memberships/report_views.py` - New view with report generation logic
3. `memberships/urls.py` - Updated with report endpoint
4. `requirements.txt` - Added openpyxl and reportlab dependencies
