# API Contract - Backend OAuth Endpoints

## Base URL
Development: `http://localhost:8000`
Production: TBD

## Authentication

All authenticated endpoints require a session cookie (`session_id`) set by the `/api/auth/callback` endpoint.

**Important:** Include `credentials: 'include'` in all fetch requests to ensure cookies are sent.

---

## Endpoints

### 1. OAuth Callback

Process OAuth connection after Nango authorization.

**Endpoint:** `POST /api/auth/callback`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  connection_id: string  // Nango connection ID from OAuth flow
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  user: {
    id: string,              // UUID
    atlassian_account_id: string
  }
}
```

**Response Headers:**
```
Set-Cookie: session_id=<uuid>; HttpOnly; SameSite=Lax; Max-Age=2592000
```

**Error Responses:**

- **404 Not Found:**
```json
{
  "detail": "Nango connection not found"
}
```

- **400 Bad Request:**
```json
{
  "detail": "Connection missing required account_id"
}
```

- **502 Bad Gateway:**
```json
{
  "detail": "Failed to communicate with OAuth provider"
}
```

- **500 Internal Server Error:**
```json
{
  "detail": "Authentication failed"
}
```

**Frontend Example:**
```typescript
async function handleOAuthCallback(connectionId: string) {
  const response = await fetch('http://localhost:8000/api/auth/callback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // REQUIRED for cookies
    body: JSON.stringify({
      connection_id: connectionId
    })
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.user;
}
```

---

### 2. Get Current Session

Retrieve the currently authenticated user.

**Endpoint:** `GET /api/auth/session`

**Request Headers:**
```
Cookie: session_id=<uuid>
```

**Request Body:** None

**Response (200 OK):**
```typescript
{
  id: string,              // UUID
  atlassian_account_id: string
}
```

**Error Responses:**

- **401 Unauthorized:**
```json
{
  "detail": "Not authenticated"
}
```

**Frontend Example:**
```typescript
async function getCurrentUser() {
  const response = await fetch('http://localhost:8000/api/auth/session', {
    credentials: 'include' // REQUIRED for cookies
  });

  if (response.status === 401) {
    // User not authenticated
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to get session: ${response.statusText}`);
  }

  return await response.json();
}
```

---

### 3. Logout

Clear the current user session.

**Endpoint:** `POST /api/auth/logout`

**Request Headers:**
```
Cookie: session_id=<uuid>
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Response Headers:**
```
Set-Cookie: session_id=; Max-Age=0  // Cookie deleted
```

**Frontend Example:**
```typescript
async function logout() {
  const response = await fetch('http://localhost:8000/api/auth/logout', {
    method: 'POST',
    credentials: 'include' // REQUIRED for cookies
  });

  if (!response.ok) {
    throw new Error(`Logout failed: ${response.statusText}`);
  }

  return await response.json();
}
```

---

## Complete OAuth Flow

### Step-by-Step Integration

1. **User clicks "Connect to Jira"**
```typescript
import Nango from '@nangohq/frontend';

const nango = new Nango({ publicKey: 'your-nango-public-key' });

// Open OAuth popup
const result = await nango.auth('jira', 'user-123');
console.log('Connection ID:', result.connectionId);
```

2. **Send connection_id to backend**
```typescript
const user = await handleOAuthCallback(result.connectionId);
console.log('Authenticated user:', user);
// Session cookie is now set automatically
```

3. **Check authentication status**
```typescript
const currentUser = await getCurrentUser();
if (currentUser) {
  console.log('User is authenticated:', currentUser);
  // Redirect to dashboard
} else {
  console.log('User not authenticated');
  // Show login page
}
```

4. **Logout when needed**
```typescript
await logout();
// Redirect to login page
```

---

## TypeScript Types

```typescript
// Request types
export interface AuthCallbackRequest {
  connection_id: string;
}

// Response types
export interface User {
  id: string;
  atlassian_account_id: string;
}

export interface AuthCallbackResponse {
  success: boolean;
  user: User;
}

export interface LogoutResponse {
  message: string;
}

// Error types
export interface ErrorResponse {
  detail: string;
}
```

---

## CORS Configuration

The backend allows requests from:
- `http://localhost:3000` (default frontend)

Additional origins can be configured via `CORS_ORIGINS` environment variable.

---

## Session Management

### Cookie Details
- **Name:** `session_id`
- **Value:** User UUID (string)
- **HttpOnly:** Yes (cannot be accessed by JavaScript)
- **SameSite:** Lax (CSRF protection)
- **Secure:** Yes in production (HTTPS only)
- **Max-Age:** 2592000 seconds (30 days)
- **Path:** `/` (all routes)

### Session Validation
- Sessions are validated on every request to authenticated endpoints
- Invalid session UUIDs are rejected
- Expired sessions (30+ days) are automatically cleared by the browser

---

## Error Handling Best Practices

```typescript
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include'
  });

  if (response.status === 401) {
    // Session expired or invalid
    // Redirect to login
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}
```

---

## Testing Checklist

- [ ] OAuth callback successfully creates user
- [ ] Session cookie is set after OAuth
- [ ] Session endpoint returns user data when authenticated
- [ ] Session endpoint returns 401 when not authenticated
- [ ] Logout clears session cookie
- [ ] Session persists across page refreshes
- [ ] Session expires after 30 days
- [ ] Cookies work in production (HTTPS)
- [ ] CORS headers allow frontend requests

---

## OpenAPI Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

These provide:
- Request/response schemas
- Try-it-out functionality
- Generated TypeScript/JavaScript clients
