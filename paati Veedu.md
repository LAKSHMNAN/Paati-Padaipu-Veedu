# Shri Udayammai Paati Padaippu Veedu

## Complete Project Documentation

This document describes the current implementation of the Paati Veedu member, auction, receipt, donation, and deposit management system.

## 1. Project Overview

The application replaces a spreadsheet-based workflow with a relational web application. It maintains member and non-member master data, creates auction items and globally unique tokens, records auction transactions, issues receipts, tracks deposits and donations, and generates paid/unpaid auction reports.

The system has:

- A React and Vite frontend.
- A Django and Django REST Framework backend.
- MySQL support for normal use.
- SQLite support for local development and testing.
- Cookie-based login sessions.
- Separate administrator and normal-user capabilities.
- Search, pagination, validation, and CRUD operations.
- Swagger API documentation.
- CSV, Excel, PDF, and JSON auction report generation.

## 2. Technology Stack

### Backend

- Python
- Django 5.2.2
- Django REST Framework 3.16.0
- drf-yasg 1.21.10
- MySQL through `mysqlclient`
- SQLite as a fallback database
- openpyxl 3.1.5 for Excel reports
- fpdf2 2.7.0 for PDF reports
- deep-translator 1.11.4 for English-to-Tamil auction-item translation

### Frontend

- React 18
- Vite 5
- Axios
- Plain CSS

## 3. Project Structure

```text
paati veedu/
├── backend/
│   ├── backend/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── middleware.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── memberships/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── report_serializers.py
│   │   ├── report_views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── tests.py
│   │   └── migrations/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   └── db.sqlite3
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── styles.css
│   │   ├── services/api.js
│   │   └── components/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── docs/
├── README.md
└── paati Veedu.md
```

## 4. Main Features

### Authentication

- New users can register with a username, optional email, and password.
- Django password validators are applied during registration.
- Passwords are stored as secure hashes.
- Login success and failure attempts are recorded with IP address and timestamp.
- The logged-in account ID is stored in a Django session.
- The frontend sends cookies by using Axios `withCredentials: true`.
- Logout removes the account ID from the session.

### Dashboard

The dashboard shows:

- Total auction value.
- Paid auction value.
- Unpaid auction value.
- Member donation total.
- Non-member donation total.
- Total donations.
- Number of registered members.
- Number of issued receipts.

### Member Data

Administrator-only master-data workspace containing:

- Member records.
- Non-member records.
- Searchable tables.
- Add, edit, delete, and full-record views.

### Receipts

- A receipt belongs to exactly one member or one non-member.
- Its phone number must match the selected person's primary or secondary phone.
- Receipt numbers are unique.
- A custom duplicate-receipt validation message is returned.
- Receipt date is recorded.

### Auction Items

Administrator-only module.

- Stores English and Tamil item names.
- Item quantity determines how many tokens are allocated.
- Tokens are globally sequential and unique across auction items.
- Increasing quantity appends new tokens.
- Quantity cannot be reduced after token generation.
- Used tokens are tracked automatically.
- English names are translated to Tamil when the item is saved.
- If translation fails, the English name is retained.

### Auction Transactions

- Supports both members and non-members.
- Searches people by ID, name, phone, type, or place.
- An available auction item and token are selected.
- The token determines the auction item on the backend.
- Name, phone, and place are copied from the selected source.
- New transactions begin as `Unpaid` in the current frontend workflow.
- A used token cannot be reused.
- Editing or deleting a transaction synchronizes token availability.
- A receipt, when attached, must belong to the same member or non-member.
- Paid records are not editable from the auction transaction screen.

### Reports

- Separate Paid and Unpaid views.
- Search by member/non-member ID, name, phone, item, token, receipt, challan, place, or payment status.
- Summary counts and values.
- Paginated transaction display.
- Excel and PDF export from the frontend.
- Backend also supports JSON and CSV for auction reports.
- Generated paid/unpaid reports are stored as `AuctionReport` snapshots.
- Donation reports are available as PDF.

### Deposits

- Every deposit is linked to a receipt.
- Stores amount and date.
- Search is available by receipt number.

### Auction Contributions

The frontend labels the `EelamEntry` module as **Auction**.

- Supports member and non-member entries.
- The selected type must match the selected relationship.
- Phone is automatically copied from the selected person.
- Stores the contribution amount.

### Donations

- Supports member and non-member donors.
- Donor name and phone are populated automatically.
- The donor type must match the selected member or non-member.
- Search supports donor type, IDs, names, and phones.
- Donation PDF reports can be generated.

## 5. User Roles and Permissions

### Administrator

An account with `is_admin=True` can:

- View, create, update, and delete members.
- View and manage non-members.
- View and manage auction items.
- Use all normal transaction modules.

### Normal User

A normal account can use the operational modules shown by the frontend, including:

- Dashboard.
- Receipts.
- Auction transactions.
- Reports.
- Deposits.
- Auction contributions.
- Donations.

The frontend hides `Member Data` and `Auction Item` from normal users. The backend explicitly enforces administrator access for member writes/details and auction-item endpoints.

> Important: Most other API endpoints do not currently enforce a general logged-in-session permission on the backend. The frontend requires login, but production deployment should also add a backend authentication/permission class to every protected API.

## 6. Database Models

All primary business models that inherit `TimeStampedModel` contain `created_at` and `updated_at`.

### Registration

Stores application accounts.

| Field | Description |
|---|---|
| `username` | Unique login name |
| `email` | Optional email |
| `password_hash` | Hashed password |
| `last_login_at` | Last successful login |
| `is_active` | Account enabled status |
| `is_admin` | Administrator permission |

### Login

Audit trail for authentication attempts.

| Field | Description |
|---|---|
| `registration` | Related account when found |
| `username` | Attempted username |
| `is_successful` | Login result |
| `failure_reason` | Failure explanation |
| `ip_address` | Client IP |

### Member

| Field | Rule |
|---|---|
| `member_id` | Primary key |
| `name` | Required |
| `patta_name` | Required |
| `primary_phone` | Unique valid Indian mobile number |
| `secondary_phone` | Optional and unique |
| `address_line1` | Required |
| `address_line2` | Optional |
| `address_line3` | Optional |
| `city` | Required |
| `pincode` | Exactly six digits |
| `native_place` | `Nerkuppai` or `Vendanpatti` |

Phone numbers must be unique across both members and non-members. A member's primary and secondary phone cannot be identical.

### Relative / Non-Member

| Field | Rule |
|---|---|
| `non_member_id` | Automatically generated, such as `NMEM_101` |
| `name` | Required |
| `phone_1` | Unique valid mobile number |
| `phone_2` | Optional and unique |
| `place` | Optional |
| `type` | `Guest` or `Penn Vitarr` |

The generated ID starts after `NMEM_100` and increases from the highest existing value.

### Receipt

| Field | Description |
|---|---|
| `receipt_no` | Primary key |
| `member` | Optional protected member relation |
| `relative` | Optional protected non-member relation |
| `phone_number` | Must match selected source |
| `receipt_date` | Receipt date |

Exactly one of `member` and `relative` must be set.

### AuctionItem

| Field | Description |
|---|---|
| `auction_item_name` | English item name |
| `auction_item_name_tamil` | Generated Tamil name |
| `quantity` | Number of tokens required |
| `tokens` | JSON list of allocated tokens |
| `used_tokens` | JSON list of consumed tokens |

### AuctionItemToken

Token registry used to enforce global uniqueness.

| Field | Description |
|---|---|
| `item` | Owning auction item |
| `auction_item_name` | Copied item name |
| `token_number` | Globally unique primary key |
| `used_token_number` | Set when consumed |

### AuctionTransaction

| Field | Description |
|---|---|
| `member` | Optional member |
| `relative` | Optional non-member |
| `name` | Automatically copied |
| `primary_phone_number` | Automatically copied |
| `native_place` | Member native place or blank for stored model value |
| `item` | Determined by token |
| `token_number` | Required unique-use token |
| `price` | Non-negative amount |
| `payment_status` | `Paid` or `Unpaid` |
| `receipt` | Optional matching receipt |
| `challan` | Optional challan reference |

Exactly one source must be selected.

### AuctionReport

Stores generated report snapshots:

- Report status.
- Generation timestamp.
- Transaction count.
- Total amount.
- Summary JSON.
- Payment-status breakdown JSON.
- Transaction JSON.

### Deposit

| Field | Description |
|---|---|
| `receipt` | Protected receipt relation |
| `amount` | Non-negative amount |
| `date` | Deposit date |

### EelamEntry

| Field | Description |
|---|---|
| `type` | `Member` or `Non-Member` |
| `member` | Member source when applicable |
| `relative` | Non-member source when applicable |
| `phone` | Automatically copied |
| `amount` | Non-negative amount |

### Donation

| Field | Description |
|---|---|
| `donor_type` | `Member` or `Non-Member` |
| `member` | Member donor when applicable |
| `relative` | Non-member donor when applicable |
| `donor_name` | Automatically copied |
| `phone` | Automatically copied |
| `amount` | Non-negative amount |

## 7. Important Data Relationships

```text
Registration ──< Login

Member ──< Receipt >── Relative
Member ──< AuctionTransaction >── Relative
Member ──< EelamEntry >── Relative
Member ──< Donation >── Relative

AuctionItem ──< AuctionItemToken
AuctionItem ──< AuctionTransaction
Receipt ──< AuctionTransaction
Receipt ──< Deposit
```

`PROTECT` is used for important business relations, preventing referenced members, non-members, receipts, or auction items from being deleted accidentally.

## 8. Backend API

Base development URL:

```text
http://127.0.0.1:8000/api
```

List endpoints use Django REST Framework limit/offset pagination. The default page size is 10.

Common query parameters:

| Parameter | Purpose |
|---|---|
| `search` | Module-specific text search |
| `limit` | Number of results |
| `offset` | Starting result index |
| `format` | Report output format |

### Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register/` | Register an account |
| POST | `/auth/login/` | Login and create session |
| POST | `/auth/logout/` | End session |
| GET | `/auth/me/` | Return current session user |

Registration example:

```json
{
  "username": "operator",
  "email": "operator@example.com",
  "password": "StrongPassword123!",
  "password_confirm": "StrongPassword123!"
}
```

Login example:

```json
{
  "username": "operator",
  "password": "StrongPassword123!"
}
```

### CRUD Endpoints

| Resource | List/Create | Detail |
|---|---|---|
| Members | `/members/` | `/members/{member_id}/` |
| Receipts | `/receipts/` | `/receipts/{receipt_no}/` |
| Auction transactions | `/auction-transactions/` | `/auction-transactions/{id}/` |
| Transaction alias | `/transactions/` | `/transactions/{id}/` |
| Non-members | `/relatives/` | `/relatives/{id}/` |
| Deposits | `/deposits/` | `/deposits/{id}/` |
| Auction items | `/auction-items/` | `/auction-items/{id}/` |
| Auction contributions | `/eelam/` | `/eelam/{id}/` |
| Donations | `/donations/` | `/donations/{id}/` |

Supported methods:

- List endpoint: `GET`, `POST`
- Detail endpoint: `GET`, `PUT`, `PATCH`, `DELETE`

Additional endpoints:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auction-items/translate/` | Preview English-to-Tamil translation |
| GET | `/dashboard/` | Return dashboard totals |

### Report Endpoints

| Endpoint | Formats |
|---|---|
| `/reports/auction-transactions/` | JSON, CSV, Excel, PDF |
| `/reports/auction-transactions/paid/` | JSON, CSV, Excel, PDF |
| `/reports/auction-transactions/unpaid/` | JSON, CSV, Excel, PDF |
| `/reports/donations/` | PDF |

Examples:

```text
GET /api/reports/auction-transactions/?format=json
GET /api/reports/auction-transactions/?format=csv
GET /api/reports/auction-transactions/paid/?format=excel
GET /api/reports/auction-transactions/unpaid/?format=pdf
GET /api/reports/auction-transactions/?search=NMEM_101
GET /api/reports/donations/?format=pdf
```

The frontend uses `excel` as the Excel format value.

## 9. Swagger and Django Admin

Swagger UI:

```text
http://127.0.0.1:8000/swagger/
```

OpenAPI JSON:

```text
http://127.0.0.1:8000/swagger.json
```

Django admin:

```text
http://127.0.0.1:8000/admin/
```

The custom `Registration` accounts are separate from Django's built-in admin users. A Django superuser is required for `/admin/`.

Create one with:

```powershell
python manage.py createsuperuser
```

## 10. Frontend Architecture

### `App.jsx`

The main component:

- Checks the current login session.
- Shows the registration/login screen when unauthenticated.
- Loads members, receipts, non-members, auction items, and dashboard data.
- Builds lookup values for forms.
- Controls module navigation.
- Hides administrator-only modules from normal users.
- Routes receipt completion from unpaid auction transactions.

### `services/api.js`

Provides the Axios client and functions for:

- Registration, login, logout, and current user.
- List, retrieve, create, update, and delete operations.
- Dashboard loading.
- Auction report loading and export URLs.
- Donation report URL generation.
- Auction-item translation.

### Reusable Components

| Component | Responsibility |
|---|---|
| `AuthPage` | Registration and login |
| `DashboardCards` | Summary metrics |
| `ResourceSection` | Generic CRUD forms and tables |
| `DataTable` | Tabular display, actions, pagination |
| `AuctionTransactionForm` | Specialized auction workflow |
| `AuctionReports` | Paid/unpaid reporting |
| `ModuleIcon` | Sidebar icons |
| `ModuleSwitcher` | Module selection support |

## 11. Local Installation

### Prerequisites

- Python compatible with Django 5.2.
- Node.js and npm.
- MySQL Server when using MySQL.
- A C/C++ build environment may be required if `mysqlclient` has no suitable wheel.

### Backend Setup

From the project root:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r .\backend\requirements.txt
Set-Location .\backend
```

For SQLite:

```powershell
$env:DB_ENGINE = "django.db.backends.sqlite3"
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

For MySQL:

```powershell
$env:DB_ENGINE = "django.db.backends.mysql"
$env:DB_NAME = "Paati_member_veedu"
$env:DB_USER = "root"
$env:DB_PASSWORD = "your-password"
$env:DB_HOST = "localhost"
$env:DB_PORT = "3306"
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

### Environment Loading Note

`settings.py` uses `os.getenv`, but the project does not currently use `python-dotenv` or `django-environ`. Therefore, creating `backend/.env` alone does not automatically load its values.

Use one of these approaches:

- Set environment variables in PowerShell as shown above.
- Configure them in the hosting service.
- Add a supported environment loader in a future change.

### Frontend Setup

Open another PowerShell window:

```powershell
Set-Location .\frontend
npm install
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000/api"
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173/
```

### Production Build

```powershell
Set-Location .\frontend
npm run build
```

The compiled frontend is written to `frontend/dist/`.

## 12. Environment Variables

### Backend

| Variable | Example | Purpose |
|---|---|---|
| `DJANGO_SECRET_KEY` | Long random value | Session and cryptographic signing |
| `DJANGO_DEBUG` | `False` | Debug mode |
| `DJANGO_ALLOWED_HOSTS` | `example.com,www.example.com` | Allowed HTTP hosts |
| `DB_ENGINE` | `django.db.backends.mysql` | Database backend |
| `DB_NAME` | `Paati_member_veedu` | Database name |
| `DB_USER` | `root` | Database user |
| `DB_PASSWORD` | Secret | Database password |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `3306` | Database port |
| `CORS_ALLOWED_ORIGINS` | Frontend origins | Credentialed CORS origins |

### Frontend

| Variable | Example |
|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api` |

Vite variables are embedded at build time, so rebuild after changing production values.

## 13. CORS and Sessions

The custom CORS middleware:

- Allows configured origins.
- Allows credentials.
- Allows `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS`.
- Allows local Vite ports 5173 through 5177.

Frontend and backend must use compatible hostnames. Avoid mixing `localhost` and `127.0.0.1` when diagnosing cookie/session behavior.

For production HTTPS, configure Django session-cookie security and trusted origins appropriately.

## 14. Validation Rules

Key backend rules include:

- Indian mobile numbers must contain ten digits and start from 6 through 9.
- Phone numbers cannot be duplicated across members and non-members.
- Primary and secondary phone numbers must differ.
- Pincode must contain six digits.
- Receipts require exactly one source.
- Receipt phone must belong to the selected source.
- Auction tokens must be positive whole numbers.
- Tokens are globally unique.
- Used tokens cannot be selected again.
- Auction item quantity cannot be reduced after token generation.
- Auction transactions require exactly one member/non-member source.
- Transaction receipt and source must match.
- Donations and auction contributions require a relation matching their declared type.
- Referenced records cannot be deleted when protected relations exist.

## 15. Typical Business Workflow

### Initial Administration

1. Create or identify an administrator account.
2. Add member master data.
3. Add non-member data.
4. Create auction items and quantities.
5. Confirm generated tokens.

### Auction Operation

1. Open Auction Transaction.
2. Search and select a member or non-member.
3. Select an auction item.
4. Select an available token.
5. Enter the price.
6. Create the transaction as unpaid.
7. Use the Transaction action when payment is received.
8. Create or attach the matching receipt.
9. Confirm the record appears as paid.

### Financial Follow-Up

1. Record deposits against receipts.
2. Record member/non-member donations.
3. Record other auction contributions.
4. Review dashboard totals.
5. Generate paid and unpaid reports.
6. Export Excel or PDF files.

## 16. Testing

Run backend checks:

```powershell
Set-Location .\backend
$env:DB_ENGINE = "django.db.backends.sqlite3"
python manage.py check
python manage.py migrate
python manage.py test memberships
```

Build-test the frontend:

```powershell
Set-Location .\frontend
npm run build
```

The backend tests cover important behaviors including:

- Duplicate phone rejection.
- Receipt phone and duplicate-number validation.
- Token generation and global sequencing.
- Token quantity expansion.
- Token reuse prevention.
- Tamil translation success and fallback.
- Member and non-member auction transactions.
- Receipt ownership.
- Token release after transaction deletion.
- Token synchronization after editing.
- Protected auction-item deletion.
- Administrator-only module access.
- Donation autofill.
- Member/non-member type validation.

## 17. Troubleshooting

### Frontend Does Not Start: `spawn EPERM`

Vite uses an `esbuild` child process. Security software, OneDrive controls, or a restricted terminal can block it.

Try:

```powershell
Set-Location .\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

If it still fails:

- Run the terminal with suitable permission.
- Allow the project's `node_modules\esbuild` executable in security software.
- Move the repository out of a synchronized/restricted folder.
- Remove and reinstall `node_modules`.

### Frontend Opens but API Calls Fail

Check:

- Backend is running on port 8000.
- `VITE_API_BASE_URL` points to `/api`.
- CORS includes the exact frontend origin.
- Both applications use either `localhost` or `127.0.0.1` consistently.

### MySQL Connection Error

Check:

- MySQL service is running.
- Database exists.
- Username and password are correct.
- Environment variables are actually loaded.
- `mysqlclient` is installed.

For a quick local fallback:

```powershell
$env:DB_ENGINE = "django.db.backends.sqlite3"
python manage.py migrate
python manage.py runserver
```

### Tamil Translation Does Not Work

Translation depends on an external Google translation service through `deep-translator`. When unavailable, the application saves the cleaned English item name instead.

### Login Appears to Reset

Check browser cookies and ensure:

- Axios uses `withCredentials`.
- CORS allows credentials.
- The frontend origin is allowed.
- Hostnames are consistent.

## 18. Security and Production Checklist

Before production deployment:

- Remove the hard-coded development `SECRET_KEY` fallback.
- Remove any hard-coded database password fallback from `settings.py`.
- Rotate any password that has been committed or shared.
- Set `DJANGO_DEBUG=False`.
- Configure exact `DJANGO_ALLOWED_HOSTS`.
- Configure exact HTTPS CORS origins.
- Add backend authentication enforcement to all business endpoints.
- Re-enable or deliberately configure CSRF protection for session-authenticated writes.
- Set secure session and CSRF cookie options.
- Use HTTPS.
- Serve Django with a production WSGI/ASGI server.
- Serve frontend static files through a production web server/CDN.
- Restrict database network access.
- Back up the database.
- Add structured application and audit logging.
- Review who can set `is_admin`.

## 19. Known Implementation Notes

- The custom account model is not Django's `AUTH_USER_MODEL`; it is an application-level registration table.
- Django admin authentication is separate from frontend authentication.
- Registration creates normal users by default.
- Migration `0017` seeds an administrator account; review and rotate any seeded credentials.
- Most CRUD APIs depend on frontend login gating rather than a universal backend permission.
- Authentication views are CSRF-exempt.
- The current auction frontend creates transactions as unpaid and handles payment through the receipt flow.
- Auction-item translation requires network access.
- Report snapshots may grow the database over time.
- The existing `docs/REPORTS.md` contains older dependency notes; `backend/requirements.txt` and the current code are the authoritative source.

## 20. Useful Commands

Start backend:

```powershell
Set-Location .\backend
..\ .venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

The path above contains a display space between `..` and `.venv`; the reliable command from the project root is:

```powershell
.\.venv\Scripts\python.exe .\backend\manage.py runserver 127.0.0.1:8000
```

Start frontend:

```powershell
Set-Location .\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Create migrations:

```powershell
Set-Location .\backend
python manage.py makemigrations
python manage.py migrate
```

Run tests:

```powershell
Set-Location .\backend
python manage.py test memberships
```

Build frontend:

```powershell
Set-Location .\frontend
npm run build
```

## 21. Development URLs

| Service | URL |
|---|---|
| Frontend | `http://127.0.0.1:5173/` |
| Backend API | `http://127.0.0.1:8000/api/` |
| Swagger | `http://127.0.0.1:8000/swagger/` |
| OpenAPI JSON | `http://127.0.0.1:8000/swagger.json` |
| Django Admin | `http://127.0.0.1:8000/admin/` |

---

This documentation reflects the repository implementation inspected on June 21, 2026.
