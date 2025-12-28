# Quick Reference: 401 Error Handling

## TL;DR

✅ **All Slice 7 requirements are already implemented.** No code changes needed.

---

## API Endpoints and 401 Responses

### 1. `/api/auth/session` - Check Session Status

**Request:**
```bash
GET /api/auth/session
Cookie: session_id=<uuid>
```

**Success Response:**
```json
HTTP/1.1 200 OK
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "atlassian_account_id": "557058:f58131cb-b67d-43c7-b30d-6b58d40bd077"
}
```

**401 Response:**
```json
HTTP/1.1 401 Unauthorized
{
  "detail": "Not authenticated"
}
```

**Triggers 401:**
- No `session_id` cookie
- Invalid UUID format in cookie
- UUID not found in database

---

### 2. `/api/boards` - Get Jira Boards

**Request:**
```bash
GET /api/boards
Cookie: session_id=<uuid>
```

**Success Response:**
```json
HTTP/1.1 200 OK
{
  "boards": [
    {"id": 1, "name": "Sprint Board"},
    {"id": 2, "name": "Kanban Board"}
  ]
}
```

**401 Response (Session Invalid):**
```json
HTTP/1.1 401 Unauthorized
{
  "detail": "Not authenticated"
}
```

**401 Response (Token Expired):**
```json
HTTP/1.1 401 Unauthorized
{
  "detail": "Invalid or expired Jira credentials"
}
```

**Triggers 401:**
- No valid session (same as `/api/auth/session`)
- Jira OAuth token expired
- Jira OAuth token revoked

---

## Error Message Meanings

| Error Message | Cause | Frontend Action |
|--------------|-------|-----------------|
| `"Not authenticated"` | Session cookie is missing, invalid, or expired | Redirect to login/OAuth flow |
| `"Invalid or expired Jira credentials"` | Jira OAuth token has expired | Trigger Jira re-authentication |

---

## Code Locations

### Session Validation
- **File:** `/Users/amalakhov/jira-dashboard/backend/app/auth/service.py`
- **Methods:**
  - `get_session_user_id()` - Validates UUID format
  - `get_current_user()` - Looks up user in database
- **Returns:** `User` object or `None`

### Session Endpoint
- **File:** `/Users/amalakhov/jira-dashboard/backend/app/auth/routes.py`
- **Endpoint:** `GET /api/auth/session`
- **Logic:** If `user is None` → 401

### Boards Service (Jira API Integration)
- **File:** `/Users/amalakhov/jira-dashboard/backend/app/boards/service.py`
- **Method:** `fetch_boards()`
- **Logic:** If `response.status_code == 401` → 401

### Boards Endpoint
- **File:** `/Users/amalakhov/jira-dashboard/backend/app/boards/routes.py`
- **Endpoint:** `GET /api/boards`
- **Logic:** Validates session, then calls `fetch_boards()`

---

## Testing 401 Scenarios

### Test 1: No Session Cookie
```bash
curl -i http://localhost:8000/api/auth/session
# Expected: 401 {"detail": "Not authenticated"}
```

### Test 2: Invalid Session Cookie
```bash
curl -i http://localhost:8000/api/auth/session \
  -H "Cookie: session_id=invalid-uuid"
# Expected: 401 {"detail": "Not authenticated"}
```

### Test 3: Non-existent User
```bash
curl -i http://localhost:8000/api/auth/session \
  -H "Cookie: session_id=00000000-0000-0000-0000-000000000000"
# Expected: 401 {"detail": "Not authenticated"}
```

### Test 4: Expired Jira Token (Requires Mock)
This requires mocking Nango to return 401. See `test_401_handling.py` for implementation.

---

## Adding 401 Handling to New Endpoints

### Pattern to Follow

```python
from typing import Annotated, Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.service import AuthService, get_auth_service
from app.db.session import get_db

router = APIRouter()

@router.get("/my-protected-endpoint")
async def my_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    session_id: Annotated[Optional[str], Cookie()] = None,
):
    """Your endpoint with session validation."""

    # 1. Validate session
    user = await auth_service.get_current_user(session_id=session_id, db=db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # 2. Use user.nango_connection_id for API calls
    # 3. Your business logic here

    return {"result": "success"}
```

### Key Points

1. **Dependencies:**
   - `db: AsyncSession` - Database session
   - `auth_service: AuthService` - Auth service
   - `session_id: Optional[str]` - Session cookie (optional, extracted from Cookie header)

2. **Validation:**
   - Call `auth_service.get_current_user(session_id, db)`
   - Check if result is `None`
   - Raise `HTTPException(401)` if not authenticated

3. **Using the User:**
   - `user.id` - User UUID
   - `user.nango_connection_id` - For Nango API calls
   - `user.atlassian_account_id` - Jira account ID

---

## Logging

### What Gets Logged

**Auth failures (WARNING level):**
```
Unauthorized boards access attempt
Invalid session_id format: invalid-uuid
```

**API errors (ERROR level):**
```
Jira API error: 401 - {"error": "token_expired"}
```

**Unexpected errors (EXCEPTION level):**
```
Failed to fetch boards: <full stack trace>
```

### Where to Find Logs

- **Development:** Stdout (console)
- **Production:** Configured log destination (file, CloudWatch, etc.)
- **Format:** JSON (structured logging via loguru)

---

## Security Considerations

### What's Protected

✅ **Session cookies are:**
- HTTP-only (JavaScript can't access)
- Secure in production (HTTPS only)
- SameSite=Lax (CSRF protection)
- 30-day expiry

✅ **Error responses don't leak:**
- Stack traces
- Internal server details
- Database structure
- User enumeration data

✅ **Logging is secure:**
- Stack traces only in server logs
- No passwords or tokens logged
- Connection IDs logged for debugging

### What's Not Implemented (Future Work)

- Session invalidation on logout (cookie deleted client-side only)
- Rate limiting on auth endpoints
- CAPTCHA for repeated failures
- Multi-factor authentication

---

## Troubleshooting

### Frontend gets 401 but should be authenticated

**Check:**
1. Is `session_id` cookie being sent? (Check browser DevTools → Network → Cookies)
2. Is the cookie value a valid UUID? (Should be: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
3. Does the user exist in the database? (Check logs for database queries)
4. Is CORS configured correctly? (`credentials: 'include'` in fetch)

### Frontend gets "Invalid or expired Jira credentials"

**Check:**
1. Is the OAuth token still valid in Nango? (Check Nango dashboard)
2. Did the user revoke access in Jira? (User → Settings → Connected apps)
3. Is the Nango connection_id correct? (Check user record in database)

### 401 returns HTML instead of JSON

**Cause:** Request not going through FastAPI (hitting NGINX, reverse proxy, etc.)

**Fix:** Ensure request reaches the FastAPI application

---

## Related Files

- `SLICE_7_COMPLETE.md` - Full implementation summary
- `SLICE_7_ANALYSIS.md` - Detailed code analysis
- `ERROR_FLOW_DIAGRAM.md` - Visual error flow diagrams
- `verify_401_handling.py` - Verification script
- `test_401_handling.py` - Test examples

---

## Contact

For questions about 401 handling:
1. Check this guide first
2. Review the flow diagrams in `ERROR_FLOW_DIAGRAM.md`
3. Run `verify_401_handling.py` to confirm implementation
4. Check server logs for detailed error information
