# Overview

High-level goals and principles of the Farmshop Finder project. For full original narrative see `README.md` (now modularized).

## Goals
- Editable marketing & hierarchical content (Pages + Blocks).
- Farm & product catalog with per-farm inventory (price, stock, bundle size, unit).
- Customer carts with price snapshot preservation.
- Role separation: admins (Payload UI) vs app users (farmers, customers).
- SEO: sitemap, robots, metadata.
- Progressive enhancement: server-rendered data, client interactivity only where needed.

## Principles
- Server-first data access (Payload in server components / actions).
- Minimal client JS; only interactive islands opt-in as client components.
- Strong typing from generated Payload TS types.
- Explicit ownership rules enforced in collection access + hooks.
- Separation of auth concerns (no client-side token storage).

## Directory Map (Key)
- `src/app/(frontend)` – Public app UI (App Router pages & client components).
- `src/collections` / `src/globals` – Payload schema.
- `src/app/(frontend)/cart` – Cart system (actions, hooks, API routes, sidebar UI).
- `src/app/(frontend)/MapBox` – Mapbox integration (clusters, single map, popup).
- `src/module/richText` – Rich text rendering pipeline.

---
Next: see `01-Architecture.md` for rendering & component layering.
