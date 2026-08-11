---
kind: external_dependency
name: MongoDB Atlas (cloud-hosted MongoDB)
slug: mongodb-atlas
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
---

- The server connects to a hosted MongoDB cluster via the MONGO_URI environment variable, which points to a MongoDB Atlas cluster (supramaxai.2icwd7w.mongodb.net).
- All domain data (dossiers, users, equipment) and the ERP module's 13 Mongoose models are persisted in this database.
- Verify exact connection options (retryWrites, w=majority) against the current .env before redeploying.