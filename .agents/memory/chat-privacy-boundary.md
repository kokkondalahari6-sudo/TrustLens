---
name: Chat privacy boundary
description: Privacy and authentication constraints for the TrustLens security assistant
---

TrustLens chat must remain behind the authenticated API boundary. The browser may send bounded conversation text, but provider credentials stay server-side and the assistant must not request, repeat, or encourage sharing live secrets.

**Why:** The assistant operates in a privacy product, so adding an AI chat surface must not create a second path for credential exposure or bypass workspace access controls.

**How to apply:** Keep chat routes authenticated, limit history and message size, use a security-focused system prompt, and show the user a clear warning not to paste passwords, tokens, API keys, or full payment-card numbers.