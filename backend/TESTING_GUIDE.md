# Testing Guide - OAuth Flow

## Prerequisites

1. PostgreSQL database running
2. Nango account with Jira integration configured
3. Environment variables set

## Setup

1. **Install dependencies:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/jira_dashboard
# - NANGO_SECRET_KEY=your_nango_secret_key
```

3. **Run migrations:**
```bash
alembic upgrade head
```

4. **Start server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Testing Endpoints

### 1. Health Check
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy"
}
```

### 2. OAuth Callback (Manual Test)

**Note:** In production, this is called by your frontend after Nango OAuth completes.

```bash
curl -X POST http://localhost:8000/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "test-connection-id-from-nango"
  }' \
  -c cookies.txt -v
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "atlassian_account_id": "account-id-from-nango"
  }
}
```

The response will also set a cookie: `Set-Cookie: session_id=...`

### 3. Get Current Session

```bash
curl http://localhost:8000/api/auth/session \
  -b cookies.txt
```

Expected response (if authenticated):
```json
{
  "id": "uuid-here",
  "atlassian_account_id": "account-id-from-nango"
}
```

Expected response (if not authenticated):
```json
{
  "detail": "Not authenticated"
}
```

### 4. Logout

```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

Expected response:
```json
{
  "message": "Logged out successfully"
}
```

## Integration Testing Flow

### Complete OAuth Flow Simulation

1. **Frontend initiates OAuth:**
   - User clicks "Connect to Jira"
   - Frontend opens Nango popup
   - User authorizes
   - Nango returns connection_id to frontend

2. **Frontend sends connection to backend:**
```javascript
const response = await fetch('http://localhost:8000/api/auth/callback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important! Includes cookies
  body: JSON.stringify({
    connection_id: nangoConnectionId
  })
});

const data = await response.json();
console.log('Authenticated user:', data.user);
```

3. **Subsequent requests include session automatically:**
```javascript
const response = await fetch('http://localhost:8000/api/auth/session', {
  credentials: 'include' // Includes session cookie
});

const user = await response.json();
console.log('Current user:', user);
```

## Database Verification

Check that users are being created:

```sql
-- Connect to database
psql postgresql://user:pass@localhost:5432/jira_dashboard

-- View users
SELECT id, nango_connection_id, atlassian_account_id, created_at
FROM users;

-- Check if connection ID exists
SELECT * FROM users
WHERE nango_connection_id = 'test-connection-id';
```

## Troubleshooting

### Error: "Nango connection not found"
- Verify NANGO_SECRET_KEY is correct
- Ensure connection_id is valid (from actual Nango OAuth flow)
- Check Nango dashboard for the connection

### Error: "Connection missing required account_id"
- Nango response doesn't include account_id in metadata
- Check Nango integration configuration
- May need to adjust metadata extraction in `service.py`

### Error: "Not authenticated" on /api/auth/session
- Cookie not being sent (check `credentials: 'include'` in frontend)
- Cookie expired (30 day expiry)
- Session ID invalid

### Database connection errors
- Ensure PostgreSQL is running
- Verify DATABASE_URL format: `postgresql+asyncpg://user:pass@host:port/db`
- For migrations, uses sync driver: `postgresql://` (automatic conversion)

## API Documentation

View interactive API docs:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Logs

The application uses structured JSON logging with Loguru. Key log messages:

- `"Processing OAuth callback for connection: {connection_id}"`
- `"Retrieved Nango connection for account: {account_id}"`
- `"Created new user with connection_id: {connection_id}"`
- `"Updated existing user: {user_id}"`
- `"Set session cookie for user: {user_id}"`

Watch logs in real-time:
```bash
uvicorn app.main:app --reload | jq .
```

## Load Testing

Test concurrent OAuth callbacks:

```bash
# Using Apache Bench
ab -n 100 -c 10 -p callback.json -T application/json \
  http://localhost:8000/api/auth/callback

# callback.json contains:
# {"connection_id": "test-id"}
```

## Security Testing

### Test HTTPS cookie flag
In production (DEBUG=false), cookies should have Secure flag:
```bash
curl -v http://localhost:8000/api/auth/callback \
  -X POST -H "Content-Type: application/json" \
  -d '{"connection_id": "test"}' 2>&1 | grep Set-Cookie
```

Should see: `Set-Cookie: session_id=...; HttpOnly; SameSite=lax; Secure`

### Test session expiration
Cookies expire after 30 days. Verify:
```bash
curl -v ... 2>&1 | grep Max-Age
```

Should see: `Max-Age=2592000` (30 days in seconds)
