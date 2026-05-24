# Member Management & Donation Tracking System

Production-ready full-stack application that replaces an Excel workflow with validated relational records for members, receipts, transactions, relatives, deposits, and eelam contributions.

## Stack
- Backend: Django, Django REST Framework, drf_yasg
- Frontend: React with Vite
- Database: MySQL-ready Django configuration with SQLite fallback for local development

## Project structure
- `backend/`: Django project, APIs, validations, tests, Swagger
- `frontend/`: React admin interface, dashboard, CRUD forms, search tables
- `docs/schema.md`: schema and integrity overview

## Backend setup
1. Open `backend/.env.example` and create your real environment values.
2. Set MySQL values:
   - `DB_ENGINE=django.db.backends.mysql`
   - `DB_NAME=<your_database_name>`
   - `DB_USER=root`
   - `DB_PASSWORD=<your_password>`
   - `DB_HOST=<your_host>`
   - `DB_PORT=<your_port>`
3. Run:
   - `python manage.py migrate`
   - `python manage.py runserver`

Swagger: `http://127.0.0.1:8000/swagger/`

## Frontend setup
1. Open `frontend/.env.example` and set `VITE_API_BASE_URL`.
2. Run:
   - `npm install`
   - `npm run dev`

## Verified locally
- `python manage.py check`
- `python manage.py migrate`
- `python manage.py test memberships`
- `npm run build`
