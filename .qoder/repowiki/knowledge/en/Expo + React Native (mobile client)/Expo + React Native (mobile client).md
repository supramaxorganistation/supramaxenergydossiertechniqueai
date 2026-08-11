---
kind: external_dependency
name: Expo + React Native (mobile client)
slug: expo-react-native
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

- The apps/mobile subproject is an Expo (~57) / React Native (~0.86) application that can be started with expo start --android|--ios|--web.
- It currently ships minimal assets and configuration; it is intended as a mobile front-end alongside the web client but does not yet call the ERP or core APIs.
- No external SaaS vendor beyond Expo itself is declared in its dependencies.