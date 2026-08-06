---
name: Gemini inspection resilience
description: Runtime behavior for TrustLens when the Gemini API is unavailable or rate-limited.
---

Gemini model availability and free-tier quotas can fail independently of the app and database. TrustLens should keep the inspection flow usable with bounded local pattern checks for common emails, payment cards, API keys, JWTs, passwords, phones, and IP addresses.

**Why:** A provider 404 and later a 429 quota response occurred during live verification. Returning a hard 503 made the core demo unusable even though auth, persistence, and the API were healthy.

**How to apply:** Keep Gemini as the primary contextual analyzer, but catch provider availability/rate-limit failures and return a clearly labeled local result with redaction, severity, confidence, rationale, compliance mapping, and privacy score. Never silently present fallback output as Gemini analysis.