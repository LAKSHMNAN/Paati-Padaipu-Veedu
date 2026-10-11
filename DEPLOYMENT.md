# Cloud Deployment

This project is prepared for free-tier testing with:

- Backend: Railway
- Database: MySQL
- Frontend: Vercel

## Backend Environment Variables

Configure these in Railway:

```env
DJANGO_SECRET_KEY=
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=
DB_ENGINE=django.db.backends.mysql
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=3306
CORS_ALLOWED_ORIGINS=
```

`DJANGO_ALLOWED_HOSTS` should contain the Railway backend host. `CORS_ALLOWED_ORIGINS` should contain the Vercel frontend URL. Use comma-separated values when more than one host or origin is needed.

WhatsApp environment variables are optional for this deployment. Leave them unset unless WhatsApp notifications are required.

## Backend Commands

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Run migrations:

```bash
cd backend
python manage.py migrate
```

Collect static files:

```bash
cd backend
python manage.py collectstatic --noinput
```

Start command:

```bash
cd backend
gunicorn backend.wsgi:application
```

## Frontend Environment Variables

Configure this in Vercel:

```env
VITE_API_BASE_URL=https://your-railway-backend-url/api
```

For local development:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Frontend Commands

Install dependencies:

```bash
cd frontend
npm install
```

Build command:

```bash
cd frontend
npm run build
```

Output directory:

```text
frontend/dist
```
