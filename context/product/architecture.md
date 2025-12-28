# System Architecture Overview: Jira Dashboard

---

## 1. Application & Technology Stack

- **Backend Framework:** Python with FastAPI
- **Frontend Framework:** React with Next.js
- **Frontend Language:** TypeScript
- **API Style:** REST

---

## 2. Data & Persistence

- **Primary Database:** PostgreSQL — stores user sessions, OAuth tokens, cached metrics
- **Caching:** Redis — caches Jira API responses to reduce API calls and improve performance
- **ORM:** SQLAlchemy (async)

---

## 3. Infrastructure & Deployment

- **Frontend Hosting:** Vercel — optimized for Next.js, automatic CI/CD
- **Backend Hosting:** Self-hosted with Docker Compose
- **Containers:** Docker — Python API, PostgreSQL, Redis as separate services
- **Orchestration:** Docker Compose for local development and production deployment

---

## 4. External Services & APIs

- **Jira Integration:** Jira Cloud REST API v3 — fetches issues, issue links, story points
- **Authentication:** Jira OAuth 2.0 (3LO) — provides both Jira data access and app authentication
- **User Identity:** Jira account = Dashboard account (no separate user management)

---

## 5. Observability & Monitoring

- **Logging:** Structured JSON logs using loguru
- **Health Monitoring:** Basic `/health` endpoint for uptime checks
- **Error Tracking:** Deferred to future phases (Sentry recommended when needed)
- **Metrics:** Deferred to future phases (Prometheus/Grafana recommended when needed)
