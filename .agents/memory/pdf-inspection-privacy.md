---
name: PDF inspection privacy
description: Privacy boundary for PDF uploads in the TrustLens inspector.
---

PDF uploads are handled in the browser with `pdfjs-dist`; only extracted selectable text is inserted into the existing payload editor and sent to the API. The original PDF is not uploaded or stored.

**Why:** TrustLens is a privacy-audit product, so retaining source documents or expanding the backend upload surface would increase data exposure without improving the scan result.

**How to apply:** Keep PDF upload client-side, enforce a reasonable browser file-size limit, explain that scanned image-only PDFs need OCR or pasted text, and preserve the existing text-only inspection/audit contract.