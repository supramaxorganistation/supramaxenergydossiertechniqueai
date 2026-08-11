---
kind: external_dependency
name: Puppeteer (PDF generation)
slug: puppeteer
category: external_dependency
category_hints:
    - framework_behavior
scope:
    - '**'
---

- Declared as a dependency and used by the PDF generation service to produce the STEG compliance dossier PDFs served from /api/dossiers/:id/export-pdf.
- Puppeteer runs headless Chromium on the server to render templates into downloadable PDFs; ensure the runtime has a compatible Chromium binary available.
- Confirm the template rendering approach against the official Puppeteer docs when modifying PDF output.