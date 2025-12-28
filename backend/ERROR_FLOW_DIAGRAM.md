# Error Flow Diagram - Session and Token Expiry

## Flow 1: Session Validation (`/auth/session`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: GET /api/auth/session                                  │
│ Cookie: session_id=<value>                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ auth/routes.py: get_session()                                   │
│   → Extract session_id from cookie                              │
│   → Call auth_service.get_current_user(session_id, db)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ auth/service.py: get_current_user()                             │
│   → Call get_session_user_id(session_id)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ auth/service.py: get_session_user_id()                          │
│                                                                  │
│   if not session_id:                                            │
│       return None  ────────────────┐                            │
│                                     │                            │
│   try:                              │                            │
│       return UUID(session_id)       │                            │
│   except (ValueError, AttributeError): │                         │
│       return None  ─────────────────┤                            │
└─────────────────────────────────────┼───────────────────────────┘
                         │            │
                         │            │
            ┌────────────▼────────────▼────────────┐
            │ Return: UUID or None                 │
            └────────────┬─────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ auth/service.py: get_current_user()                             │
│                                                                  │
│   if user_id is None:                                           │
│       return None  ────────────────┐                            │
│                                     │                            │
│   result = await db.execute(...)   │                            │
│   user = result.scalar_one_or_none() │                          │
│                                     │                            │
│   if user is None:                  │                            │
│       return None  ─────────────────┤                            │
│                                     │                            │
│   return user                       │                            │
└─────────────────────────────────────┼───────────────────────────┘
                         │            │
                         │            │
            ┌────────────▼────────────▼────────────┐
            │ Return: User object or None          │
            └────────────┬─────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ auth/routes.py: get_session()                                   │
│                                                                  │
│   if not user:                                                  │
│       raise HTTPException(                                      │
│           status_code=401,                                      │
│           detail="Not authenticated"                            │
│       )  ───────────────────────────┐                           │
│                                      │                           │
│   return UserResponse.model_validate(user)                      │
│   │                                  │                           │
└───┼──────────────────────────────────┼───────────────────────────┘
    │                                  │
    │                                  │
    ▼                                  ▼
┌────────────────────────┐  ┌────────────────────────────────────┐
│ HTTP 200 OK            │  │ HTTP 401 Unauthorized              │
│ {                      │  │ {                                  │
│   "id": "...",         │  │   "detail": "Not authenticated"    │
│   "atlassian_account_id": "..." │  │ }                          │
│ }                      │  │                                    │
└────────────────────────┘  └────────────────────────────────────┘
```

---

## Flow 2: Protected Endpoint (`/boards`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: GET /api/boards                                        │
│ Cookie: session_id=<value>                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ boards/routes.py: get_boards()                                  │
│   → Validate session (same as Flow 1)                           │
│                                                                  │
│   user = await auth_service.get_current_user(session_id, db)    │
│                                                                  │
│   if not user:                                                  │
│       raise HTTPException(401, "Not authenticated")  ───────────┼─┐
│                                                                  │ │
│   → Call boards_service.fetch_boards(connection_id)             │ │
└────────────────────────┬────────────────────────────────────────┘ │
                         │                                          │
                         ▼                                          │
┌─────────────────────────────────────────────────────────────────┐ │
│ boards/service.py: fetch_boards()                               │ │
│                                                                  │ │
│   try:                                                          │ │
│       response = await client.get(                              │ │
│           NANGO_PROXY_URL + "/rest/agile/1.0/board",           │ │
│           headers={                                             │ │
│               "Authorization": f"Bearer {secret_key}",          │ │
│               "Connection-Id": connection_id,                   │ │
│               "Provider-Config-Key": "jira"                     │ │
│           }                                                     │ │
│       )                                                         │ │
└────────────────────────┬────────────────────────────────────────┘ │
                         │                                          │
                         ▼                                          │
┌─────────────────────────────────────────────────────────────────┐ │
│ Nango Proxy                                                      │ │
│   → Fetch OAuth token for connection_id                         │ │
│   → Make request to Jira API                                    │ │
│   → Return Jira response                                        │ │
└────────────────────────┬────────────────────────────────────────┘ │
                         │                                          │
                         ▼                                          │
┌─────────────────────────────────────────────────────────────────┐ │
│ boards/service.py: Handle response                              │ │
│                                                                  │ │
│   if response.status_code == 401:                               │ │
│       logger.warning("Unauthorized...")                         │ │
│       raise HTTPException(                                      │ │
│           status_code=401,                                      │ │
│           detail="Invalid or expired Jira credentials"          │ │
│       )  ───────────────────────────────────────────────────────┼─┼─┐
│                                                                  │ │ │
│   if response.status_code == 403:                               │ │ │
│       raise HTTPException(403, "Access forbidden")  ────────────┼─┼─┼─┐
│                                                                  │ │ │ │
│   response.raise_for_status()  ─────────────────────────────────┼─┼─┼─┼─┐
│                                                                  │ │ │ │ │
│   data = response.json()                                        │ │ │ │ │
│   boards = [BoardResponse(...) for board in data["values"]]    │ │ │ │ │
│   return BoardsListResponse(boards=boards)                      │ │ │ │ │
│                                                                  │ │ │ │ │
│   except HTTPException:                                         │ │ │ │ │
│       raise  # Re-raise unchanged ──────────────────────────────┼─┼─┼─┼─┤
│                                                                  │ │ │ │ │
│   except httpx.HTTPStatusError as e:                            │ │ │ │ │
│       logger.error(...)                                         │ │ │ │ │
│       raise HTTPException(502, "Failed to communicate")  ───────┼─┼─┼─┼─┼─┐
│                                                                  │ │ │ │ │ │
│   except Exception as e:                                        │ │ │ │ │ │
│       logger.exception(...)                                     │ │ │ │ │ │
│       raise HTTPException(500, "Failed to retrieve")  ──────────┼─┼─┼─┼─┼─┼─┐
└──────────────────────────────────────────────────────────────────┘ │ │ │ │ │ │
                                                                    │ │ │ │ │ │ │
┌───────────────────────────────────────────────────────────────────┘ │ │ │ │ │ │
│                                                                      │ │ │ │ │ │
▼                                                                      ▼ ▼ ▼ ▼ ▼ ▼
┌──────────────────────┐  ┌───────────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ HTTP 200 OK          │  │ HTTP 401  │ │ 401   │ │ 403   │ │ 4xx/5xx│ │ 502   │ │ 500   │
│ {                    │  │ Session   │ │ Token │ │ Forbid│ │ Jira  │ │ API   │ │ Server│
│   "boards": [        │  │ {         │ │ {     │ │ {     │ │ Error │ │ {     │ │ {     │
│     {                │  │   "detail"│ │ "detail"│ │"detail"│ │       │ │"detail"│ │"detail"│
│       "id": 1,       │  │   "Not    │ │ "Invalid│ │"Access"│ │       │ │"Failed"│ │"Failed"│
│       "name": "..."  │  │   authenticated" │ │or expired"│ │forbidden"│ │     │ │to comm"│ │to ret"│
│     },               │  │ }         │ │ Jira  │ │ }     │ │       │ │ }     │ │ }     │
│     ...              │  │           │ │ credentials"│      │ │       │ │       │ │       │
│   ]                  │  │           │ │ }     │ │       │ │       │ │       │ │       │
│ }                    │  │           │ │       │ │       │ │       │ │       │ │       │
└──────────────────────┘  └───────────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
```

---

## Key Error Scenarios

### Scenario 1: Missing Session Cookie
```
Input: No session_id cookie
↓
auth_service.get_session_user_id(None)
↓
Returns: None
↓
auth_service.get_current_user() returns None
↓
route checks: if not user → raise HTTPException(401)
↓
Output: 401 {"detail": "Not authenticated"}
```

### Scenario 2: Invalid Session UUID
```
Input: session_id="invalid-uuid"
↓
auth_service.get_session_user_id("invalid-uuid")
↓
try UUID("invalid-uuid") → ValueError
↓
except ValueError → return None
↓
auth_service.get_current_user() returns None
↓
route checks: if not user → raise HTTPException(401)
↓
Output: 401 {"detail": "Not authenticated"}
```

### Scenario 3: Non-existent User
```
Input: session_id="00000000-0000-0000-0000-000000000000"
↓
auth_service.get_session_user_id() → UUID object
↓
auth_service.get_current_user() queries DB
↓
DB returns None (no user with that ID)
↓
route checks: if not user → raise HTTPException(401)
↓
Output: 401 {"detail": "Not authenticated"}
```

### Scenario 4: Expired Jira Token
```
Input: Valid session, but Jira token expired
↓
boards_service.fetch_boards() calls Nango proxy
↓
Nango tries to use expired token
↓
Jira API returns 401
↓
Nango proxy returns 401
↓
boards_service checks: if status_code == 401
↓
raise HTTPException(401, "Invalid or expired Jira credentials")
↓
Output: 401 {"detail": "Invalid or expired Jira credentials"}
```

---

## Error Handling Best Practices Applied

### 1. Clean Error Responses
- ✅ All errors wrapped in `HTTPException`
- ✅ User-friendly `detail` messages
- ✅ No stack traces in responses
- ✅ Appropriate HTTP status codes

### 2. Server-Side Logging
- ✅ `logger.warning()` for auth failures
- ✅ `logger.error()` for API errors
- ✅ `logger.exception()` for unexpected errors
- ✅ Correlation via connection_id

### 3. Exception Chain
```python
try:
    # Original operation
except HTTPException:
    raise  # Clean response, re-raise unchanged

except SpecificError as e:
    logger.error(f"Context: {e}")
    raise HTTPException(...) from e  # Preserve chain for debugging

except Exception as e:
    logger.exception("Unexpected error")  # Full stack trace in logs
    raise HTTPException(...) from e  # Clean response to client
```

### 4. Status Code Strategy
- `401`: Authentication required (session or token)
- `403`: Authenticated but not authorized
- `500`: Server error (our code)
- `502`: Upstream service error (Nango/Jira)

---

## Frontend Integration Guide

### Handling 401 Responses

```typescript
async function fetchBoards() {
  try {
    const response = await fetch('/api/boards', {
      credentials: 'include'  // Include session cookie
    });

    if (response.status === 401) {
      const error = await response.json();

      // Check if it's a token expiry vs session expiry
      if (error.detail.includes('expired Jira credentials')) {
        // Jira token expired - trigger re-auth
        redirectToOAuthFlow();
      } else {
        // Session expired - redirect to login
        redirectToLogin();
      }
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.boards;

  } catch (error) {
    console.error('Failed to fetch boards:', error);
    showErrorMessage('Unable to load boards');
  }
}
```

---

## Summary

**All error flows properly handle 401 scenarios:**
- ✅ Session validation returns 401 for invalid sessions
- ✅ Protected endpoints validate sessions
- ✅ Jira API 401s are caught and propagated
- ✅ All responses are clean JSON
- ✅ Stack traces never exposed
- ✅ Detailed logging for debugging
