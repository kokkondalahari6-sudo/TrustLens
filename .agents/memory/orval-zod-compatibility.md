---
name: OpenAPI Zod compatibility
description: Orval output compatibility with the workspace's installed Zod runtime.
---

Orval can generate Zod 4-only helpers such as `zod.email()` and `zod.int()` even when the workspace resolves Zod 3. The generated code then fails the library typecheck.

**Why:** The workspace currently pins Zod 3 through its package catalog, while newer Orval releases default to modern Zod output.

**How to apply:** In the API spec package's Orval Zod override, use the numeric `version: 3` setting whenever the target package resolves Zod 3. Re-run codegen and the library typecheck after changing the OpenAPI contract.