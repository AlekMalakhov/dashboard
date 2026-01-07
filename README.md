# Jira Dashboard

A web application for tracking Jira metrics, including rework ratio analysis for engineering teams.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Python FastAPI, Uvicorn
- **Integration**: Jira Cloud REST API

## Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (optional, for containerized setup)
- Jira Cloud API credentials

## Quick Start

### 1. Clone and Setup Environment

```bash
# Copy environment file and configure
cp backend/.env.example .env
```

Edit `.env` with your configuration:

```env
DEBUG=false
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/jira_dashboard
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=["http://localhost:3000"]
```

### 2. Run with Docker (Recommended)

```bash
# Start backend
docker compose up

# In a separate terminal, start frontend
cd frontend
npm install
npm run dev
```

### 3. Run Locally (Without Docker)

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/boards` | List Jira boards |
| `GET /api/rework/*` | Rework ratio metrics |

## Development

### Frontend Commands

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run test:e2e  # Run Playwright E2E tests
```

### Backend Commands

```bash
uvicorn app.main:app --reload  # Start with hot reload
```

## Project Structure

```
jira-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes (health)
│   │   ├── boards/       # Boards module
│   │   ├── core/         # Config, settings
│   │   └── rework/       # Rework ratio module
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   └── package.json
├── docker-compose.yml
└── .env
```

## License

Private project.
