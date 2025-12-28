# Jira Dashboard Backend

FastAPI backend for the Jira Dashboard application with OAuth integration via Nango.

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL database
- Nango account and API keys

### Installation

1. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Database Migrations

Run Alembic migrations to create database tables:

```bash
# Apply all migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

### Running the Application

Development mode:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Production mode:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Health Check
- `GET /api/health` - Health check endpoint

### Authentication
- `POST /api/auth/callback` - OAuth callback endpoint (receives Nango connection ID)
- `GET /api/auth/session` - Get current authenticated user
- `POST /api/auth/logout` - Logout current user

## Architecture

### Database Models

**User** (`users` table):
- `id` (UUID) - Primary key
- `nango_connection_id` (TEXT) - Unique Nango connection reference
- `atlassian_account_id` (VARCHAR) - Jira/Atlassian account ID
- `created_at` (TIMESTAMP) - Record creation time
- `updated_at` (TIMESTAMP) - Last update time

### OAuth Flow

1. Frontend initiates OAuth with Nango SDK
2. User authorizes in Atlassian consent screen
3. Nango handles callback and returns connection_id
4. Frontend sends connection_id to `POST /api/auth/callback`
5. Backend:
   - Fetches connection details from Nango
   - Creates/updates user record
   - Sets HTTP-only session cookie
6. User is authenticated for subsequent requests

### Session Management

Sessions are managed via HTTP-only cookies containing the user UUID. This provides:
- XSS protection (HTTP-only flag)
- CSRF protection (SameSite=Lax)
- Secure transmission in production (Secure flag when not in debug mode)

## Project Structure

```
backend/
├── alembic/                    # Database migrations
│   ├── versions/              # Migration files
│   └── env.py                 # Alembic configuration
├── app/
│   ├── api/                   # API endpoints
│   │   └── health.py         # Health check
│   ├── auth/                  # Authentication module
│   │   ├── routes.py         # Auth endpoints
│   │   ├── schemas.py        # Pydantic models
│   │   └── service.py        # Auth & Nango services
│   ├── core/                  # Core configuration
│   │   └── config.py         # Settings
│   ├── db/                    # Database layer
│   │   ├── base.py           # SQLAlchemy base
│   │   ├── models.py         # Database models
│   │   └── session.py        # Session management
│   └── main.py               # FastAPI app entry point
├── .env.example              # Environment template
├── alembic.ini              # Alembic config
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Development

### Type Checking

This codebase follows strict typing standards:
- All functions have type hints
- Pydantic models for all data structures
- SQLAlchemy 2.0 with typed mappings

### Logging

Uses Loguru for structured JSON logging. All auth operations are logged for audit purposes.

### Error Handling

- HTTP exceptions for client errors (4xx)
- Comprehensive error logging
- Graceful error responses

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug mode | `false` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `NANGO_SECRET_KEY` | Nango API secret key | (required) |
| `CORS_ORIGINS` | Allowed CORS origins | `["http://localhost:3000"]` |
