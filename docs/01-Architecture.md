# Architecture & Rendering Model

Explains server vs client boundaries and rendering strategy.

## Rendering Layers
- **Server Components**: Fetch data via `getPayload` and compose layout.
- **Client Components**: Interactive UI only (`'use client'`), receiving plain serializable props.
- **Server Actions**: Authenticated mutations (login, cart modifications, farm create/update) encapsulating business rules.

## Data Flow
1. Request hits Next.js route (`app/.../page.tsx`).
2. Page fetches data with Payload SDK (server-side) using collection queries.
3. Data serialized to client components / or re-fetched via React Query if dynamic.
4. Mutations run server actions; client invalidates queries (React Query) for fresh cache.

## Why This Pattern
- Avoids leaking secrets/token to client.
- Keeps performance high (less JS shipped initially).
- Centers business logic & access control on server.

## Payload Integration
- `payload.config.ts` registers collections, globals, plugins (SEO, S3, nested docs).
- Access control functions inspect `req.user` (collection + role) to allow/deny.

## Edge Cases & Strategies
- Hydration mismatch avoided by not reading cookies in client prematurely.
- Dynamic routes: farm detail, potential nested Pages catch-all (future).

---
See `02-Data-Model.md` for collections & relationships.
