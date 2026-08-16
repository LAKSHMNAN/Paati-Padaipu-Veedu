# Final Paati Veedu Documentation

## Project Overview

`Shri Udayammai Paati Padaippu Veedu` is a full-stack member management, auction, donation, receipt, deposit, and reporting application. It replaces an Excel-based workflow with validated relational records, searchable modules, linked receipts, payment tracking, and exportable reports.

The application has two main parts:

- Backend: Django REST API with validation, database models, authentication, reports, and Swagger documentation.
- Frontend: React and Vite application with login, year selection, dashboards, forms, searchable tables, reports, and workflow-specific screens.

## Technology Stack

Backend:

- Python
- Django 5.2.2
- Django REST Framework 3.16.0
- drf-yasg for Swagger API documentation
- SQLite for local development
- MySQL-ready configuration for production
- openpyxl for Excel report generation
- fpdf2 for PDF report generation
- deep-translator for auction item Tamil translation

Frontend:

- React 18.3.1
- Vite 5.4.x
- Axios for API calls
- CSS modules through `frontend/src/styles.css`

Development tools:

- Django migrations
- Vite build
- Git branch workflow
- Local virtual environment in `.venv`

## Project Structure

```text
backend/
  manage.py
  backend/
    settings.py
    urls.py
  memberships/
    models.py
    serializers.py
    views.py
    report_views.py
    report_serializers.py
    urls.py
    year_utils.py
    migrations/

frontend/
  index.html
  package.json
  vite.config.js
  src/
    App.jsx
    main.jsx
    services/api.js
    components/
      AuthPage.jsx
      AuctionTransactionForm.jsx
      AuctionReports.jsx
      DataTable.jsx
      DashboardCards.jsx
      ModuleIcon.jsx
      ResourceSection.jsx
    styles.css
```

## Environment Setup

Backend setup:

```powershell
cd backend
..\ .venv\Scripts\python.exe manage.py migrate
..\ .venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Use this exact command without the space after `..\`:

```powershell
..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Frontend setup:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Local URLs:

- Frontend: `http://127.0.0.1:5173/`
- Backend Swagger: `http://127.0.0.1:8000/swagger/`
- API base URL: `http://127.0.0.1:8000/api`

## Authentication Flow

The application supports registration, login, logout, and current-user session checking.

API endpoints:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`

Flow:

1. User opens the frontend.
2. Frontend calls `/api/auth/me/` to check if a session already exists.
3. If no user is logged in, `AuthPage.jsx` displays login/register.
4. User logs in.
5. Backend stores the logged-in account ID in the Django session.
6. Frontend stores the user in app state.
7. The year selection page is shown before the dashboard.

Automatic logout behavior:

- Django sessions are configured with `SESSION_EXPIRE_AT_BROWSER_CLOSE = True`.
- Login explicitly calls `request.session.set_expiry(0)`.
- If a user or admin closes the browser without clicking logout, the session cookie expires when the browser session ends.
- On reopening the app after the browser is closed, the user must log in again.

Admin behavior:

- Admin users can access admin-only modules such as Member Data and Auction Item.
- Non-admin users are redirected away from restricted modules.

## Year-Based Accounting System

The year-based system was implemented because accounts happen once every three years.

After login, every user must select a working year before entering the application.

Example year list when the current year is 2026:

```text
2026
2023
2020
2017
2014
...
```

Frontend implementation:

- `App.jsx` shows `YearSelectionPage` after login.
- The selected year is stored in React state as `selectedYear`.
- Sidebar shows the active working year.
- User can click `Change Year` to return to year selection.
- `frontend/src/services/api.js` stores the active year globally through `setActiveRecordYear`.
- Axios automatically attaches `year=<selectedYear>` to API requests.
- For create/update/patch requests, Axios also adds `record_year` to the request payload.

Backend implementation:

- `record_year` field added to year-scoped models.
- Shared helper file: `backend/memberships/year_utils.py`
- List APIs filter by `record_year`.
- Create APIs save new records with the selected `record_year`.
- Dashboard totals use the selected year.
- Reports and exports use the selected year.

Migration:

- `0023_auctionitem_record_year_auctionreport_record_year_and_more.py`
- Existing data is backfilled using date fields where possible:
  - Receipt uses `receipt_date`
  - Deposit uses `date`
  - Auction report uses `generated_at`
  - Auction transaction uses receipt date if linked, otherwise `created_at`
  - Other records use `created_at`

## Core Database Models

Main models:

- `Registration`: application user account.
- `Login`: login audit record.
- `Member`: master member data.
- `Relative`: non-member data.
- `Receipt`: receipt number linked to member or non-member.
- `AuctionItem`: auction item with generated token numbers.
- `AuctionItemToken`: token registry for auction items.
- `AuctionTransaction`: auction transaction with token, price, status, and receipt.
- `AuctionReport`: saved report snapshot.
- `Deposit`: deposit entry linked to receipt.
- `EelamEntry`: member/non-member contribution record.
- `Donation`: donation record.

Year-scoped models include:

- Member
- Relative
- Receipt
- AuctionItem
- AuctionTransaction
- AuctionReport
- Deposit
- EelamEntry
- Donation

## Backend API Modules

Authentication:

- `/api/auth/register/`
- `/api/auth/login/`
- `/api/auth/logout/`
- `/api/auth/me/`

Members:

- `GET /api/members/`
- `POST /api/members/`
- `GET /api/members/<member_id>/`
- `PUT/PATCH /api/members/<member_id>/`
- `DELETE /api/members/<member_id>/`

Receipts:

- `GET /api/receipts/`
- `POST /api/receipts/`
- `GET /api/receipts/<receipt_no>/`
- `PUT/PATCH /api/receipts/<receipt_no>/`
- `DELETE /api/receipts/<receipt_no>/`

Auction transactions:

- `GET /api/auction-transactions/`
- `POST /api/auction-transactions/`
- `GET /api/auction-transactions/<id>/`
- `PUT/PATCH /api/auction-transactions/<id>/`
- `DELETE /api/auction-transactions/<id>/`

Non-members:

- `GET /api/relatives/`
- `POST /api/relatives/`
- `GET /api/relatives/<id>/`
- `PUT/PATCH /api/relatives/<id>/`
- `DELETE /api/relatives/<id>/`

Deposits:

- `GET /api/deposits/`
- `POST /api/deposits/`
- `GET /api/deposits/<id>/`
- `PUT/PATCH /api/deposits/<id>/`
- `DELETE /api/deposits/<id>/`

Auction items:

- `GET /api/auction-items/`
- `POST /api/auction-items/`
- `POST /api/auction-items/translate/`
- `GET /api/auction-items/<id>/`
- `PUT/PATCH /api/auction-items/<id>/`
- `DELETE /api/auction-items/<id>/`

Eelam:

- `GET /api/eelam/`
- `POST /api/eelam/`
- `GET /api/eelam/<id>/`
- `PUT/PATCH /api/eelam/<id>/`
- `DELETE /api/eelam/<id>/`

Donations:

- `GET /api/donations/`
- `POST /api/donations/`
- `GET /api/donations/<id>/`
- `PUT/PATCH /api/donations/<id>/`
- `DELETE /api/donations/<id>/`

Dashboard:

- `GET /api/dashboard/`

Reports:

- `GET /api/reports/donations/?format=pdf`
- `GET /api/reports/auction-transactions/?format=json|csv|pdf|excel`
- `GET /api/reports/auction-transactions/paid/?format=json|csv|pdf|excel`
- `GET /api/reports/auction-transactions/unpaid/?format=json|csv|pdf|excel`

All year-scoped API calls accept:

```text
?year=2026
```

## Frontend Application Flow

1. App starts in `App.jsx`.
2. Current session is checked through `fetchCurrentUser`.
3. If no user exists, `AuthPage.jsx` is displayed.
4. After login, `YearSelectionPage` is displayed.
5. User selects a working year.
6. Axios stores the selected year.
7. Dashboard and lookup data load for only that year.
8. Sidebar navigation becomes available.
9. User opens modules and works only inside selected year data.

## Frontend Modules

Dashboard:

- Shows totals for the selected year.
- Totals include auction, paid auction, unpaid auction, donations, members, and receipts.

Member Data:

- Admin-only module.
- Contains two nested sections:
  - Add Member
  - Non Member Data

Receipts:

- Creates receipt numbers.
- Links receipts to either a member or non-member.
- Validates phone number against selected source.
- Used by auction payment flow.

Auction Transaction:

- Creates auction transaction records.
- Supports member and non-member source selection.
- Uses auction item tokens.
- Prevents duplicate token use.
- Shows unpaid transactions with a `Transaction` action.
- `Transaction` action opens receipt flow.

Reports:

- Shows paid and unpaid auction transaction reports.
- Supports search.
- Supports Excel and PDF exports.
- Uses selected working year.

Deposits:

- Tracks deposit entries against receipts.

Auction Item:

- Admin-only module.
- Creates auction items.
- Generates token numbers.
- Tracks used tokens.
- Translates item names to Tamil.

Auction / Eelam:

- Tracks member and non-member contribution records.

Donations:

- Tracks member and non-member donations.
- Supports donation PDF reports.

## Auction Transaction Payment Flow

Original issue:

- User clicked `Transaction` in Auction Transaction.
- App opened Receipt module.
- Receipt was created.
- Then auction transaction update failed with:

```json
{"token_number":["This field is required."],"price":["This field is required."]}
```

Cause:

- Frontend used `PUT` to update auction transaction.
- `PUT` expects a full object.
- Frontend only sent `payment_status` and `receipt`.
- Backend rejected missing `token_number` and `price`.

Fix:

- Added `patchItem` in `frontend/src/services/api.js`.
- Receipt flow now uses `PATCH` instead of `PUT`.
- Backend marks transaction as `Paid` when a receipt is attached.
- If receipt was already created by a failed previous attempt, the retry links the existing receipt and marks transaction paid.

Current flow:

1. Create auction transaction as `Unpaid`.
2. Click `Transaction`.
3. Receipt module opens with transaction details.
4. User enters receipt number and date.
5. Receipt is created.
6. Auction transaction is patched with receipt.
7. Backend marks transaction as `Paid`.
8. Auction Transaction table updates after refresh/reload.

## WhatsApp Payment Notification Flow

The application integrates with Meta WhatsApp Cloud API for auction payment confirmation messages.

Notification trigger:

- Notification is sent only when an existing `AuctionTransaction` changes from `Unpaid` to `Paid`.
- Notification is not sent when an auction transaction is created.
- Notification is not sent only because a receipt is created.
- Notification is not sent for unrelated edits.

Service architecture:

- `backend/memberships/services/templates.py`: builds reusable message text.
- `backend/memberships/services/whatsapp_service.py`: reads environment variables, builds Meta API payloads, sends WhatsApp messages, normalizes phone numbers, logs request/response data, and handles errors.
- `backend/memberships/services/notification_service.py`: owns business logic for selecting the recipient, checking duplicate protection, creating `NotificationLog`, calling the WhatsApp service, and updating final status.

Environment variables:

```text
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=v20.0
```

Meta API endpoint:

```text
POST https://graph.facebook.com/{version}/{phone_number_id}/messages
```

Recipient selection:

- Member transaction: uses `member.primary_phone`
- Non-member transaction: uses `relative.phone_1`
- Phone numbers are converted to E.164 format. Example: `6382371435` becomes `916382371435`.

Duplicate protection:

- Before sending, the service checks `NotificationLog` for the same transaction and notification type.
- If a `Pending` or `Sent` payment notification already exists, sending is skipped.

Notification log:

- `NotificationLog` stores recipient name, phone number, notification type, full message, Meta message ID, status, full response JSON, created time, and sent time.
- Status values are `Pending`, `Sent`, and `Failed`.
- Failures are saved instead of breaking the payment flow.

Failure handling:

- Missing WhatsApp environment variables
- Invalid phone number
- 401, 403, 404, 429, and 500 HTTP responses
- Expired token responses from Meta
- Connection timeout
- Network errors
- Unexpected exceptions

If WhatsApp credentials are not configured, payment still completes and a failed notification log is saved.

## Validation Rules

Member:

- Member ID is primary key.
- Primary phone must be unique.
- Secondary phone must be unique if provided.
- Secondary phone cannot equal primary phone.
- Member phone cannot already belong to non-member.

Non-member:

- `non_member_id` is auto-generated.
- Primary phone must be unique.
- Secondary phone must be unique if provided.
- Phone cannot already belong to member.

Receipt:

- Must belong to either member or non-member, not both.
- Phone must match selected member or non-member.
- Duplicate receipt number is blocked.

Auction item:

- Quantity generates token numbers.
- Tokens are unique.
- Quantity cannot be reduced after tokens are generated.

Auction transaction:

- Must belong to either member or non-member.
- Token number is required.
- Token must exist.
- Token cannot already be used.
- Receipt must belong to the same selected member or non-member.

Donation and Eelam:

- Member type requires member only.
- Non-member type requires non-member only.
- Phone/name are derived from selected source.

## Reports

Auction reports:

- Paid report
- Unpaid report
- All/search report
- JSON for frontend tables
- CSV export
- Excel export
- PDF export

Donation report:

- PDF export
- Summary totals for member and non-member donors

Reports respect:

- Search text
- Payment status
- Selected working year

## Commands

Backend check:

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py check
```

Create migrations:

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py makemigrations
```

Apply migrations:

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py migrate
```

Check migration status:

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py showmigrations memberships
```

Start backend:

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Start frontend:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1
```

Build frontend:

```powershell
cd frontend
npm run build
```

## Recently Verified

The following verification commands were run successfully after the latest implementation:

```powershell
..\.venv\Scripts\python.exe manage.py check
npm run build
```

Migration status:

- Latest migration `0023_auctionitem_record_year_auctionreport_record_year_and_more` is applied locally.
- `makemigrations --check --dry-run` returned `No changes detected`.

## Git Notes

Current branch used during work:

```text
Shri-Udayammai-Paati-Padaippu-Veedu
```

The requested branch name with spaces was invalid in Git:

```text
Shri- Udayammai- Paati- Padaippu- Veedu
```

Valid branch names should avoid spaces.

One commit was created locally for the auction receipt payment fix:

```text
d0b3f59 Fix auction receipt payment update
```

Push failed because GitHub credentials were not authenticated on the machine:

```text
Invalid username or token. Password authentication is not supported for Git operations.
```

After GitHub authentication is fixed, push with:

```powershell
git push origin Shri-Udayammai-Paati-Padaippu-Veedu
```

## Important Files

Backend:

- `backend/memberships/models.py`: database models and validations.
- `backend/memberships/serializers.py`: API serialization and dashboard totals.
- `backend/memberships/views.py`: CRUD API views and shared year filtering.
- `backend/memberships/report_views.py`: report generation and exports.
- `backend/memberships/year_utils.py`: selected-year parsing and queryset filtering.
- `backend/memberships/urls.py`: API route definitions.

Frontend:

- `frontend/src/App.jsx`: app shell, login state, year selection, modules, sidebar.
- `frontend/src/services/api.js`: Axios API client and year request interceptor.
- `frontend/src/components/AuthPage.jsx`: login/register screen.
- `frontend/src/components/ResourceSection.jsx`: reusable CRUD module UI.
- `frontend/src/components/AuctionTransactionForm.jsx`: auction transaction workflow.
- `frontend/src/components/AuctionReports.jsx`: auction report UI and export buttons.
- `frontend/src/components/DataTable.jsx`: shared table rendering.
- `frontend/src/styles.css`: application styling.

## End-to-End User Flow

1. User opens frontend.
2. User logs in or registers.
3. User selects working year, such as `2026` or `2023`.
4. App loads dashboard totals only for selected year.
5. User opens module.
6. Lists display only selected year data.
7. New records are saved with selected year.
8. Reports and exports use selected year.
9. User can change year from the sidebar.
10. Changing year reloads data for that year without mixing other years.

## Current Behavior Summary

- Data is separated by `record_year`.
- Year dropdown uses three-year intervals.
- Admin and normal users both use year selection.
- Admin-only modules remain restricted to admin accounts.
- Auction payment through receipt uses partial update and works without requiring token/price again.
- Reports, dashboard, exports, lookup data, and CRUD modules respect selected year.
