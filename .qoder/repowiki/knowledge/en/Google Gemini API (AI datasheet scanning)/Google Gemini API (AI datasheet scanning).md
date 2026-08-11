---
kind: external_dependency
name: Google Gemini API (AI datasheet scanning)
slug: google-gemini-api
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

- Used to scan uploaded equipment datasheet PDFs and extract brand/model/specs into structured fields for the Dossier and Equipment catalog.
- Integrated via the @google/generative-ai SDK; the API key is read from the GEMINI_API_KEY environment variable.
- Authentication is token-based through the SDK; no custom signing logic is implemented in this repo.
- Verify exact model name and prompt shape against the Gemini SDK docs when updating the scanner.