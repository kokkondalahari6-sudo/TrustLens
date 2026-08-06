---
name: Auth session resilience
description: Durable rules for TrustLens browser session persistence and logout behavior.
---

TrustLens keeps the JWT and the authenticated user profile in browser storage after the API successfully registers or logs a user in. Logout must remove both values, clear user-scoped query state, and navigate to the auth screen.

**Why:** A malformed remembered profile can render the protected shell before the user can reach the logout control, so session restoration must never trust browser JSON blindly.

**How to apply:** Treat missing, invalid, or incomplete stored profile data as unauthenticated-safe fallback data; keep the database as the source of truth for account creation and password verification.

Dashboard responses should also be treated as untrusted at the rendering boundary: guard arrays, severity keys, timeline entries, and optional audit fields before mapping or dereferencing them.

**Why:** Authenticated users can still crash the shell when an API returns an empty, stale, or partially shaped response even though the token itself is valid.

**How to apply:** Prefer safe empty states and fallback labels for optional dashboard data, while preserving the API error state for failed requests.