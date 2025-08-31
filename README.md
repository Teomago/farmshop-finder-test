# Farmshop Finder

Next.js + Payload CMS project for discovering local farms and their products. Uses **App Router**, **Payload 3.x**, **TailwindCSS v4**, **HeroUI**, **TanStack Query**, **MongoDB**, **S3 storage**, and **Brevo email**.

## Contents
1. Overview
2. Tech Stack
3. Architecture & Rendering Model
4. Data Model (Collections & Globals)
5. Routing, Slugs & Hierarchical Pages
6. Authentication & Authorization
7. Client State (TanStack Query Pattern)
8. Domain: Farms, Products & Inventory
9. Farmer Ownership Model
10. Page Builder (Blocks)
11. Utilities (S3, Email, Slug, Site URL)
12. Styling (Tailwind + HeroUI)
13. SEO & Indexing
14. Testing (Vitest + Playwright)
15. Development & Commands
16. Deployment (Vercel / Docker)
17. Environment Variables
18. Roadmap

---

## 1. Overview
Goals:
- Editable marketing & hierarchical content with blocks.
- Multiple switchable Home variants.
- Catalog of products; farms reference products with per‑farm inventory (quantity, unit, price, price snapshot in carts).
- Role‑based portal (farmers manage a single farm; customers build carts; admins manage via Payload UI).
- SEO foundation (metadata, sitemap, robots) and type‑safe server boundaries.

Principles:
- Data fetch in Server Components / server actions; UI & interaction in Client Components only when needed.
- Strict separation of admin vs application users.
- Slug pipeline produces stable unique `pathname` independent of editable title.
- Minimize client JS: only interactive sections are client components.

## 2. Tech Stack
- Next.js 15 (App Router, Server Components)
- Payload CMS 3.53 (MongoDB, Lexical rich text, nested docs, SEO, S3 storage)
- TailwindCSS v4 + HeroUI component library
- TanStack Query 5 for client session/data caching
- MongoDB (via `@payloadcms/db-mongodb`)
- S3-compatible storage (upload adapter)
- Brevo (email adapter in `utils/brevoAdapter.ts`)

## 3. Architecture & Rendering Model
- `src/payload.config.ts` registers collections, globals, plugins.
- Server routes (`app/.../page.tsx`) perform all privileged data fetching via `getPayload`.
- Client components (`'use client'`) wrap interactive UI (forms, nav, dashboards) and consume data passed from server or fetched via safe endpoints.
- Server actions handle authentication, mutations and return safe objects; client invalidates queries for freshness.

## 4. Data Model
Collections (see `src/collections`):
- `admins` (auth): panel-only accounts.
- `users` (auth): application users with `role` select: `farmer | customer`.
- `media`: uploads (S3 storage plugin).
- `pages`: hierarchical pages with blocks & SEO metadata (nested docs + breadcrumbs → derived `pathname`).
- `products`: base product catalog (type, image, description) creatable by admins or farmers.
- `farms`: single farm per farmer; inventory array linking products with `quantity`, `unit`, `price`.
- `home`: variants for landing page; active one chosen by `home-config` global.
- `carts`: customer shopping carts with line items capturing `product`, `quantity`, `unit`, `priceSnapshot`, and `status`.

Globals:
- `header`, `footer`, `home-config`.

Key Rules:
- One farm per farmer (hook in `Farms` `beforeValidate`).
- Ownership handover allowed only by current owner (farmer) or admin.
- Carts restricted to owning user (read/update/delete) unless admin.

## 5. Routing, Slugs & Hierarchical Pages
`pages` collection uses `nestedDocsPlugin` to build breadcrumbs and a composed URL. The slug field factory ensures normalized, unique slugs (special handling allows root `/`). Final composed URL stored in a dedicated pathname field (read-only, unique). Future catch‑all route (`[[...segments]]`) will resolve requests based on stored `pathname`.

## 6. Authentication & Authorization
- Two auth collections: `admins` (Payload admin UI) and `users` (app). Client UI ignores authenticated `admins` (treat as guest).
- Session cookie (`payload-token`) is HTTP-only; server components read via `payload.auth`.
- Access control per collection enforces roles and ownership (see `Farms`, `Products`, `Carts` configs).
- Farmer vs customer logic driven by `users.role`.

## 7. Client State (TanStack Query)
Pattern:
- `useAuth` query fetches current app user (filters out admin sessions by collection).
- Mutations (login, logout, register, create/update farm) are server actions; upon success the client invalidates related queries (`['user']`, etc.).
- Avoids duplicating auth logic client-side and prevents token exposure.

When NOT to use Query: pure server-rendered marketing pages or one-off SSR fetches with no client reuse.

## 8. Domain: Farms, Products & Inventory
- A farm has: `name`, `tagline`, `location`, `farmImage` (required upload), `description` (richText), `products[]` array linking a product + `quantity`, `unit (kg|pcs|liters|boxes)`, `price` (EUR).
- Products define base attributes; pricing & stock are contextual per farm.
- Carts snapshot product price & unit at time of add to protect historical prices (`priceSnapshot`).

## 9. Cart System (Customer Carts)
The cart feature lets an authenticated customer build separate active carts per farm. Design goals:
- Preserve historical pricing via `priceSnapshot`.
- Keep cart logic server-authoritative (no client-side price calculations besides display).
- Avoid duplicated lines: one line per unique product per farm with an integer `bundles` (quantity) counter.
- Simple incremental API (add, decrement, clear) without premature checkout complexity.

### 9.1 Data Shape (Collection `carts`)
Each cart document:
```
{
  user: relation (customer user id),
  farm: relation (farm id),
  status: 'active' | 'ordered' | 'cancelled',
  items: [
    {
      product: relation (product id),
      quantity: number (bundles added),
      unit: string (copied from farm inventory at add time),
      priceSnapshot: number (copied from farm inventory at add time)
    }
  ]
}
```
Farm inventory (in `farms.products[]`) distinguishes:
- `stock`: how many bundles/lots are available to sell.
- `quantity`: size of each bundle (e.g. 5 kg per bundle).

### 9.2 Server Actions (`cartActions.ts`)
Implemented functions (all server-side, auth-checked):
- `addToCart({ farmId, productId, bundles=1 })`
  - Validates customer session, farm + product existence, and stock (cannot exceed `stock`).
  - Locates (or creates) an active cart for (user,farm).
  - Adds or increments a line item; stores `priceSnapshot` + `unit` at add time.
- `decrementCartItem({ cartId, productId, amount=1 })`
  - Decreases quantity; removes line if it reaches zero; deletes cart if last line removed.
- `clearAllCarts()` removes all active carts for the customer (utility for current UX).
- `getCart(farmId)` returns a single farm cart; `getAllCarts()` returns all active carts for badge/dropdown.
- Internal helpers:
  - `serializeCart(cart, farm)` builds a `CartDTO` ({ id, farmId, farmName, lines[], total }).
  - `fillMissingProductNames` fallback fetches product names if population failed, ensuring names not IDs.

Key invariants:
- One active cart per (user,farm) pair.
- A product appears at most once per cart (quantity aggregated in `quantity`).
- Price displayed comes from `priceSnapshot * quantity` (never recalculated from current farm price).

### 9.3 API Routes (`/cart/api/*`)
Thin HTTP wrappers around server actions so client code can call via `fetch`:
- `GET /cart/api` → `getAllCarts` (used by navbar).
- `POST /cart/api/add` → `addToCart`.
- `POST /cart/api/decrement` → `decrementCartItem`.
- `POST /cart/api/clear` → `clearAllCarts`.
All return JSON payloads (`{ cart }`, `{ carts }` or `{ deleted }` / error object).

### 9.4 Client Hooks (`useCarts.ts`)
Built with TanStack Query for caching + automatic updates:
- `useAllCarts()` query key `['carts']` pulls all active carts.
- `useCartTotals()` derives totals: `total` (sum of cart totals) and `itemCount` (sum of all line `bundles`).
- Mutations:
  - `useAddToCart()` → invalidates `['carts']` on success.
  - `useDecrementItem()` → invalidates after decrement/removal.
  - `useClearCarts()` → invalidates after clearing.
Cache invalidation keeps UI consistent without manual state stitching.

### 9.5 UI Integration
#### Farm Product Card (`FarmDetail.tsx`)
- Shows inventory: `Quantity` (bundle size) + `Stock` (available bundles).
- If logged user is a customer → renders an "Add" button that calls `useAddToCart().mutate` with current farm & product.
- Button disabled while mutation pending or stock unavailable.

#### Navbar (`Navbar.tsx`)
- Uses `useAllCarts` + `useCartTotals` for reactive badge and dropdown.
- Badge (`itemCount`) overlays the cart button (hidden when zero).
- Dropdown lists carts grouped by farm; each line shows:
  `ProductName (BundleSize Unit) xQuantity    €(priceEach * quantity)`
- A per-line decrement button ("-") triggers `useDecrementItem` (one bundle at a time).
- "Grand Total" summarizes all carts; "Clear All" triggers `useClearCarts`.
- Prevents unwanted menu close via `e.preventDefault()` inside action buttons.

### 9.6 Extensibility / Next Steps
Planned evolutions (not yet implemented):
- Reservation / stock decrement at checkout (currently stock is not decremented when adding to cart—only validated upper bound).
- Promotion / discount lines (would extend CartDTO lines with `type`).
- Checkout flow producing an `orders` collection and cart status transition to `ordered`.
- Optimistic UI updates (currently relies on post-mutation refetch for simplicity).

## 10. Farmer Ownership Model
Enforced constraints:
- Each farmer can create only one farm (hook rejection message if second is attempted).
- On create (farmer): owner auto-assigned.
- On update: owner field optional; if supplied and changed → must be admin or current owner (handover). Unchanged owner is stripped from update payload for noise reduction.

## 10. Page Builder (Blocks)
Current blocks (see `app/(frontend)/blocks`): Cover, Image, RichText (extensible). More blocks can be added by exporting React components and extending block mapping in `module/blockRender`.

## 11. Utilities
- S3 Storage: configured via `@payloadcms/storage-s3` plugin (prefix `media`, path-style for MinIO compatibility).
- Email: `utils/brevoAdapter.ts` sends transactional emails; no‑op logs if not activated.
- Slug helpers: `fields/slug` with formatting & uniqueness logic.
- `getSiteURL()`: central base URL normalization used across sitemap, robots, metadata.
- Misc: `deepMerge`, `generateId`, caching helpers.

## 12. Styling (Tailwind + HeroUI)
- Tailwind v4 (import in `app/(frontend)/styles.css`).
- HeroUI plugin registered via `hero.ts` (`@plugin './hero.ts';`).
- Use HeroUI components only in client components. Keep structural layout server-side for minimal JS.

## 13. SEO & Indexing
- `@payloadcms/plugin-seo` for `pages` collection adds meta fields.
- Dynamic `generateMetadata` for pages and farms builds title, description, OG/Twitter, canonical (using `getSiteURL`).
- `app/sitemap.ts` enumerates static + dynamic entries (pages, farms, home).
- `app/robots.txt/route.ts` serves sitemap reference and crawl directives.

Planned: JSON-LD structured data for Farms (LocalBusiness) & Products (Offer), `hreflang` support, large-site sitemap splitting.

## 14. Testing
- Vitest integration test (`tests/int/api.int.spec.ts`): example payload read (users collection). Expand with hooks & access tests.
- Playwright E2E (`tests/e2e/frontend.e2e.spec.ts`): baseline homepage assertion (needs update to reflect custom landing page content/title).

Suggested Additions:
- Auth flow tests (signup/login/logout).
- Farm CRUD + ownership constraints.
- Cart lifecycle (add item, snapshot price, status transitions).

## 15. Development & Commands
```bash
pnpm dev                # Start dev server
pnpm build              # Production build
pnpm start              # Start built app
pnpm test               # Run integration + e2e tests
pnpm test:int           # Vitest only
pnpm test:e2e           # Playwright only
pnpm generate:types     # Regenerate Payload TS types
pnpm generate:importmap # (Payload) regenerate admin import map
pnpm lint               # ESLint
```

Approve native builds (Tailwind/HeroUI) if prompted:
```bash
pnpm approve-builds
```

## 16. Deployment
### Vercel
- Connect repo → set environment variables → deploy (build script uses increased memory limit).
- Ensure `DATABASE_URI` and `PAYLOAD_SECRET` are configured. Add S3 + Brevo variables if media/email needed.

### Docker (Dev Convenience)
`docker-compose.yml` spins up Node container + Mongo.
1. Set `DATABASE_URI` using hostname `mongo` (e.g. `mongodb://mongo/farmshop`).
2. Run:
```bash
docker-compose up -d
```

Standalone production image available via provided multi-stage `Dockerfile` (requires `output: 'standalone'` in `next.config.mjs`).

## 17. Environment Variables
Required:
```
DATABASE_URI=
PAYLOAD_SECRET=
```
S3 (media uploads):
```
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=
S3_ENDPOINT=
```
Email (Brevo):
```
BREVO_API_KEY=
BREVO_EMAILS_ACTIVE=true
BREVO_SENDER_NAME=
BREVO_SENDER_EMAIL=
```
Optional:
```
NEXT_PUBLIC_SITE_URL=
SITE_URL=
```

## 18a. Mapping Implementation (2025-08-31)

Implemented Mapbox integration for farms (cluster + single-farm views):

Core Files:
- `app/(frontend)/MapBox/Map.tsx`: Controlled `MapView` (interactive pan/zoom, navigation + scale controls).
- `app/(frontend)/MapBox/MapBase.tsx`: Simple wrapper for single-farm map (default world fallback); avoided inside clustered map to prevent nested maps.
- `app/(frontend)/MapBox/FarmsMap.tsx`: Clustered multi-farm map (GeoJSON `Source` + `Layer` definitions; click to expand cluster or open popup).
- `app/(frontend)/MapBox/MapPopup.tsx`: Reusable popup (Mapbox GL `Popup`).
- `app/(frontend)/MapBox/types.ts`: `FarmLocation` type used to pass lean data from server page.
- `app/(frontend)/farms/FarmsMapSection.tsx`: Client-only dynamic wrapper (`ssr:false`) around cluster map.
- `app/(frontend)/farms/[slug]/MapClient.tsx`: Single farm marker + popup toggle.

Implemented Features (summary of 19 changes): clustering, popup on click (mobile-friendly), selected marker highlight, fitBounds & initial center, cluster expansion, escape to close, pointer cursor over interactive layers, removal of nested map causing popup issues, interactive single-farm map controls.

Deferred Enhancements: list↔map hover sync, filters (distance/products), user geolocation button, style/theming switch, search/geocoding, accessibility focus ring, React Query hydration for live updates.

### 18a.1 Usage Examples

#### a) Server Page → Cluster Map
```tsx
// app/(frontend)/farms/page.tsx (excerpt)
import FarmsMapSection from './FarmsMapSection'
import type { FarmLocation } from '../MapBox/types'

const payload = await getPayload({ config })
const farms = await payload.find({ collection: 'farms', draft: false, limit: 100 })
const farmLocations: FarmLocation[] = farms.docs
  .filter(f => f.geo?.lat && f.geo?.lng)
  .map(f => ({
    id: String(f.id),
    slug: f.slug ?? String(f.id),
    name: f.name || 'Unnamed Farm',
    lat: f.geo!.lat!,
    lng: f.geo!.lng!,
    locationText: f.location || ''
  }))
return <FarmsMapSection farmLocations={farmLocations} />
```

#### b) Client Wrapper (Dynamic Import)
```tsx
// app/(frontend)/farms/FarmsMapSection.tsx (simplified)
const FarmsMap = dynamic(() => import('../MapBox/FarmsMap').then(m => m.FarmsMap), { ssr: false })
export default function FarmsMapSection({ farmLocations }: { farmLocations: FarmLocation[] }) {
  return <div className="h-[420px]">{farmLocations.length ? <FarmsMap farms={farmLocations} /> : 'No farms'}</div>
}
```

#### c) Cluster Map Prop Customization
```tsx
<FarmsMap
  farms={farmLocations}
  clusterColor="#16a34a"
  clusterTextColor="#ffffff"
  markerColor="#f59e0b"
  onSelectFarm={(farm) => console.log('Selected', farm.id)}
  showDetailLink
/>
```

#### d) Single Farm Map
```tsx
'use client'
import { MapClient } from '../../MapBox/MapClient'

export function FarmMap({ name, locationText, lat, lng }: { name: string; locationText?: string; lat: number; lng: number }) {
  return <MapClient name={name} locationText={locationText} lat={lat} lng={lng} zoom={12} />
}
```

#### e) Custom Action on Selection
```tsx
<FarmsMap
  farms={farmLocations}
  onSelectFarm={(farm) => {
    const el = document.querySelector(`[data-farm-card="${farm.id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }}
/>
```

#### f) Environment Variable
```
NEXT_PUBLIC_MAPBOX_API_KEY=your_mapbox_token
```

#### g) Troubleshooting
- Popup no aparece → asegúrate de que no hay `Map` anidado y que se hace click después de expandir cluster.
- Cursor sin pointer → verifica `interactiveLayerIds` y listeners de `mouseenter/leave`.
- Centro incorrecto → confirma que `lat`/`lng` son números antes de construir `FarmLocation`.

#### h) Minimal Type
```ts
export interface FarmLocation { id: string; slug: string; name: string; lat: number; lng: number; locationText?: string }
```

These examples cubren los casos básicos y puntos de extensión.

## 18. Roadmap (Active – no dated changelog maintained)
Content & Routing:
- [ ] Catch‑all route `[[...segments]]` resolving dynamic pages by stored `pathname`.
- [ ] RichText rendering for farms/products (Lexical serializer in frontend).

Domain & Commerce:
- [ ] Product variants / seasonal availability.
- [ ] Complete cart checkout flow & order collection.
- [x] Farm geolocation fields + interactive Mapbox maps (clusters + popups). (Next: filters, geolocation, theming.)

Auth & Access:
- [ ] Prefetch/hydrate `useAuth` from server layout to eliminate initial client request.
- [ ] Ownership transfer audit log.

UX & Blocks:
- [ ] Additional blocks: Gallery, FAQ, Map, Pricing table.
- [ ] Accessible focus states & contrast audit improvements.

Performance & Caching:
- [ ] Tag-based revalidation for farms/products/pages.
- [ ] Preload critical queries during navigation.

SEO:
- [ ] JSON-LD structured data for Farms & Products.
- [ ] `hreflang` / multilingual support.

Testing:
- [ ] Expand E2E to auth + CRUD + carts.
- [ ] Hook-level unit tests (ownership, single-farm constraint).

---

Updated: 2025-08-31 (mapping implemented; roadmap entry updated).

If you modify schemas, run `pnpm generate:types` before using new fields in TypeScript.

## Appendix: Quick Code Examples

### 24.1 Fetch Farms (Server Component)
```ts
import { getPayload } from 'payload'
import config from '@/payload.config'
export async function listFarms(limit = 50) {
  const payload = await getPayload({ config })
  return payload.find({ collection: 'farms', limit, depth: 1 })
}
```

### 24.2 Fetch Farm By Slug OR ID
```ts
async function getFarmBySlugOrId(slugOrId: string) {
  const payload = await getPayload({ config })
  const bySlug = await payload.find({ collection: 'farms', limit: 1, where: { slug: { equals: slugOrId } } })
  if (bySlug.docs[0]) return bySlug.docs[0]
  try { return await payload.findByID({ collection: 'farms', id: slugOrId }) } catch { return null }
}
```

### 24.3 Slug Field Factory
```ts
export const slug = (fieldToUse = 'title', overrides = {}) => deepMerge({
  name: 'slug', type: 'text', index: true, unique: true,
  hooks: { beforeValidate: [formatSlug(fieldToUse)] }
}, overrides)
```

### 24.4 Auth Server Actions (Login / Logout / Signup)
```ts
'use server'
// login.ts
import { getPayload } from 'payload'; import config from '@/payload.config'; import { cookies } from 'next/headers'
export async function login({ email, password }: { email: string; password: string }) {
  const payload = await getPayload({ config })
  try {
    const res = await payload.login({ collection: 'users', data: { email, password } })
    if (res.token) (await cookies()).set('payload-token', res.token, { httpOnly: true, path: '/', secure: process.env.NODE_ENV==='production' })
    return { success: true }
  } catch (e:any) { return { success: false, error: e.message } }
}

// logout.ts
export async function logout() { (await cookies()).delete('payload-token') }

// register.ts
export async function register(data: { name: string; email: string; password: string; role: 'farmer'|'customer' }) {
  const payload = await getPayload({ config })
  const exists = await payload.find({ collection: 'users', where: { email: { equals: data.email } }, limit: 1 })
  if (exists.docs.length) return { success: false, error: 'Email already registered' }
  await payload.create({ collection: 'users', data })
  return login({ email: data.email, password: data.password })
}
```

### 24.5 useAuth Hook (Client) Consumption
```tsx
'use client'
import { useAuth } from '@/app/(frontend)/hooks/useAuth'
export function AuthStatus() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <span>Loading...</span>
  if (!user) return <a href="/login">Login</a>
  return <span>Hi {user.name || user.email}</span>
}
```

### 24.6 Mutation Pattern With Cache Invalidation
```tsx
import { useQueryClient } from '@tanstack/react-query'
import { login } from '@/app/(frontend)/login/actions/login'
const qc = useQueryClient()
async function onSubmit(form:{email:string;password:string}) {
  const r = await login(form)
  if (r.success) qc.invalidateQueries({ queryKey: ['user'] })
}
```

### 24.7 Protected Server Page Pattern
```ts
import { getPayload } from 'payload'; import config from '@/payload.config'; import { redirect } from 'next/navigation'
export default async function DashboardPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await import('next/headers').then(m=>m.headers()) })
  if (!user || user.collection !== 'users') redirect('/login')
  return <div>Dashboard for {user.email}</div>
}
```

### 24.8 Example Farmer-Only Create Farm Action
```ts
'use server'
import { getPayload } from 'payload'; import config from '@/payload.config'
export async function createFarm({ name, location }: { name: string; location?: string }) {
  const payload = await getPayload({ config })
  // NOTE: additional auth check (payload.auth) could be added if not called from already protected UI
  return payload.create({ collection: 'farms', data: { name, location } })
}
```

### 24.9 Admin vs User UI Filter
```tsx
const { user } = useAuth()
const isAppUser = user?.collection === 'users'
```

---

<!-- Removed obsolete duplicate numbering sections (25–26) below to maintain a single canonical structure. Authentication & SEO details already covered in sections 11, 12, 21, and the changelog. -->

### Summary
Initial authentication integration now operates fully server-side using Payload's auth system and HTTP-only cookies. The previous client-only `localStorage` token check was removed to improve security and correctness.

### Key Pieces
- **Collection Split**: `admins` (panel) vs `users` (frontend). Frontend disregards `admins` sessions.
- **Client Session State**: `useAuth` (TanStack Query) fetches `/api/users/me` and caches the current app user.
- **Navbar Conditional UI**: Uses `useAuth` and filters `user.collection === 'users'`.
- **Protected Routes**: Server components still gate sensitive pages using `payload.auth` (e.g., dashboard) before rendering.
- **Mutations**: `login`, `logout`, `register` server actions manage cookie + invalidate `['user']` cache on client.
- **Access Logic**: Collections (`Farms`, `Products`, `Carts`) check `req.user.collection` + role where applicable.
- **Owner Enforcement**: Farm updates/deletes restricted to matching `owner` or admin collection.

### Benefits
- Secure: Cookies remain HTTP-only; no token exposure.
- Responsive UI: React Query cache updates instantly after mutations.
- Separation of concerns: Server enforces, client reflects.
- Extensible: Adding new queries (products, farms) only needs a `useQuery` wrapper.

### Future Enhancements (Deferred)
- Hydrate `useAuth` with `initialData` from server layout to eliminate first fetch.
- Add optimistic cart/product mutations with `useMutation`.
- Optional passwordless or magic-link flow.

## 26. SEO & Indexing Infrastructure (Implemented)

### Components Added
- **SEO Plugin**: Integrated `@payloadcms/plugin-seo` for Pages collection (auto-added `meta` group: title, description, image fields).
- **Dynamic Metadata**: `generateMetadata` implemented for dynamic page routes and farm detail pages; builds standard meta + Open Graph + Twitter card + canonical.
- **Canonical URLs**: Added via `alternates.canonical` in metadata objects (Home, Farms index, Farm detail, and dynamic Pages).
- **Sitemap Generator**: `app/sitemap.ts` returns an array (Next.js App Router format) enumerating static roots, published Pages, and Farms.
- **Robots.txt Route**: `app/robots.txt/route.ts` serves crawl directives and references sitemap.
- **Utility**: `getSiteURL()` centralizes base URL formatting (used across metadata, sitemap, robots).

### Metadata Structure Example
```ts
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: page.meta?.title || page.name,
    description: page.meta?.description || fallback,
    alternates: { canonical: base + pathname },
    openGraph: { title, description, images },
    twitter: { title, description, images: images?.map(i => i.url), card: 'summary' },
  }
}
```

### Benefits
- Eliminates duplicate content ambiguity (canonical).
- Improves discoverability and indexing speed (sitemap + robots reference).
- Enriches social sharing previews (OG/Twitter images derived from SEO image field).
- Centralized base URL logic reduces drift across features.

### Future Enhancements (Deferred)
- Structured data (JSON-LD) for Farms (`LocalBusiness`) and Products (`Product` with Offers).
- Multi-language `hreflang` alternates.
- Per-collection sitemap splitting if scale demands.
- Image optimization pipeline signals (dimensions, mime) in OG tags.

This README favors completeness over brevity while eliminating redundant duplication. Each major system (installation, styling, data modeling, slug pipeline, dynamic rendering, future user roles & commerce features) is documented once in a dedicated section. Update types after schema changes (`pnpm payload generate:types`) before adjusting client components.

Ongoing documentation: keep this file updated as roadmap items are delivered.

## 27. Recent Updates (Changelog)

### 2023-10-10
- **Feature**: Implemented dynamic Home page variant selection via `home-config` global.
- **Feature**: Added SEO metadata generation and sitemap/robots integration.
- **Fix**: Resolved hydration mismatch in auth state by removing `localStorage` reliance.
- **Fix**: Eliminated redundant "Only admins can change the owner" errors by decoupling update authorization from input payload.

### 2023-09-25
- **Feature**: Integrated TanStack Query for client state management.
- **Feature**: Added authentication helpers (`login`, `logout`, `getUser`) for server actions.
- **Fix**: Adjusted `beforeChange` hook logic for farm ownership to allow admin overrides.

### 2023-09-10
- **Feature**: Initial commit with Next.js, Payload CMS, TailwindCSS, and HeroUI setup.
- **Feature**: Basic farm and product listing pages.

---

## 28. Roadmap / TODO (Always Last)
Core Content & Routing:
- [ ] Implement catch‑all route `[[...segments]]` resolving by `pages.pathname` for dynamic hierarchical page rendering.
- [ ] RichText renderer (Lexical) for Farms / Products / Home sections.

Type & Performance:
- [ ] Strong types for client components (remove `any` in `FarmDetail`, `Farms`).
- [ ] Caching & revalidation strategy (e.g. tag-based invalidation, `revalidateTag`).

Products & Commerce:
- [ ] Product variant system (if future granularity required: size, packaging, seasonal availability).
- [ ] Shopping cart model (session + persistent) scoped per farm or aggregated; evaluate multi-farm constraints.

User Authentication (NEW):
- [ ] Public user auth separate from admin (new `publicUsers` or extend `users` with role field).
- [ ] Role-based access: `farmOwner` can CRUD its own Farm + inventory lines; `customer` can create carts & orders.
- [ ] Ownership enforcement via access control hooks (e.g., match user ID to `farm.owner`).

Cart & Orders (NEW):
- [ ] `carts` collection: { user, farm, items[{ product, quantity, unit, priceSnapshot }], status }.
- [ ] Validation hook: ensure items' farm matches cart.farm.
- [ ] Price snapshot field to preserve historical pricing.

Map & Geolocation (NEW):
- [ ] Add geolocation fields to Farms: { latitude, longitude } or GeoJSON point.
- [ ] Map component (Leaflet or Mapbox GL) plotting farm markers.
- [ ] Optional clustering & distance filtering.

UI Enhancements:
- [ ] Additional blocks: Gallery, FAQ, Map, Pricing table.
- [ ] Accessible focus states & improved color contrast audit.

Testing & Quality:
- [ ] Expand E2E to cover farm listing & detail pages.
- [ ] Add integration tests for slug duplication & nested docs path sync.
- [ ] Add snapshot tests for new blocks.

---

## 29. Quick Code Examples

### 29.1 Fetch Farms (Server Component)
```ts
import { getPayload } from 'payload'
import config from '@/payload.config'
export async function listFarms(limit = 50) {
  const payload = await getPayload({ config })
  return payload.find({ collection: 'farms', limit, depth: 1 })
}
```

### 29.2 Fetch Farm By Slug OR ID
```ts
async function getFarmBySlugOrId(slugOrId: string) {
  const payload = await getPayload({ config })
  const bySlug = await payload.find({ collection: 'farms', limit: 1, where: { slug: { equals: slugOrId } } })
  if (bySlug.docs[0]) return bySlug.docs[0]
  try { return await payload.findByID({ collection: 'farms', id: slugOrId }) } catch { return null }
}
```

### 29.3 Slug Field Factory
```ts
export const slug = (fieldToUse = 'title', overrides = {}) => deepMerge({
  name: 'slug', type: 'text', index: true, unique: true,
  hooks: { beforeValidate: [formatSlug(fieldToUse)] }
}, overrides)
```

### 29.4 Auth Server Actions (Login / Logout / Signup)
```ts
'use server'
// login.ts
import { getPayload } from 'payload'; import config from '@/payload.config'; import { cookies } from 'next/headers'
export async function login({ email, password }: { email: string; password: string }) {
  const payload = await getPayload({ config })
  try {
    const res = await payload.login({ collection: 'users', data: { email, password } })
    if (res.token) (await cookies()).set('payload-token', res.token, { httpOnly: true, path: '/', secure: process.env.NODE_ENV==='production' })
    return { success: true }
  } catch (e:any) { return { success: false, error: e.message } }
}

// logout.ts
export async function logout() { (await cookies()).delete('payload-token') }

// register.ts
export async function register(data: { name: string; email: string; password: string; role: 'farmer'|'customer' }) {
  const payload = await getPayload({ config })
  const exists = await payload.find({ collection: 'users', where: { email: { equals: data.email } }, limit: 1 })
  if (exists.docs.length) return { success: false, error: 'Email already registered' }
  await payload.create({ collection: 'users', data })
  return login({ email: data.email, password: data.password })
}
```

### 29.5 useAuth Hook (Client) Consumption
```tsx
'use client'
import { useAuth } from '@/app/(frontend)/hooks/useAuth'
export function AuthStatus() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <span>Loading...</span>
  if (!user) return <a href="/login">Login</a>
  return <span>Hi {user.name || user.email}</span>
}
```

### 29.6 Mutation Pattern With Cache Invalidation
```tsx
import { useQueryClient } from '@tanstack/react-query'
import { login } from '@/app/(frontend)/login/actions/login'
const qc = useQueryClient()
async function onSubmit(form:{email:string;password:string}) {
  const r = await login(form)
  if (r.success) qc.invalidateQueries({ queryKey: ['user'] })
}
```

### 29.7 Protected Server Page Pattern
```ts
import { getPayload } from 'payload'; import config from '@/payload.config'; import { redirect } from 'next/navigation'
export default async function DashboardPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await import('next/headers').then(m=>m.headers()) })
  if (!user || user.collection !== 'users') redirect('/login')
  return <div>Dashboard for {user.email}</div>
}
```

### 29.8 Example Farmer-Only Create Farm Action
```ts
'use server'
import { getPayload } from 'payload'; import config from '@/payload.config'
export async function createFarm({ name, location }: { name: string; location?: string }) {
  const payload = await getPayload({ config })
  // NOTE: additional auth check (payload.auth) could be added if not called from already protected UI
  return payload.create({ collection: 'farms', data: { name, location } })
}
```

### 29.9 Admin vs User UI Filter
```tsx
const { user } = useAuth()
const isAppUser = user?.collection === 'users'
```

---

## 30. Final Notes
_(Section numbering shifted: original Final Notes moved to 22 after adding implemented Auth & SEO sections.)_

## 30. Authentication & Access Control (Implemented & Updated with React Query)

### Summary
Initial authentication integration now operates fully server-side using Payload's auth system and HTTP-only cookies. The previous client-only `localStorage` token check was removed to improve security and correctness.

### Key Pieces
- **Collection Split**: `admins` (panel) vs `users` (frontend). Frontend disregards `admins` sessions.
- **Client Session State**: `useAuth` (TanStack Query) fetches `/api/users/me` and caches the current app user.
- **Navbar Conditional UI**: Uses `useAuth` and filters `user.collection === 'users'`.
- **Protected Routes**: Server components still gate sensitive pages using `payload.auth` (e.g., dashboard) before rendering.
- **Mutations**: `login`, `logout`, `register` server actions manage cookie + invalidate `['user']` cache on client.
- **Access Logic**: Collections (`Farms`, `Products`, `Carts`) check `req.user.collection` + role where applicable.
- **Owner Enforcement**: Farm updates/deletes restricted to matching `owner` or admin collection.

### Benefits
- Secure: Cookies remain HTTP-only; no token exposure.
- Responsive UI: React Query cache updates instantly after mutations.
- Separation of concerns: Server enforces, client reflects.
- Extensible: Adding new queries (products, farms) only needs a `useQuery` wrapper.

### Future Enhancements (Deferred)
- Hydrate `useAuth` with `initialData` from server layout to eliminate first fetch.
- Add optimistic cart/product mutations with `useMutation`.
- Optional passwordless or magic-link flow.

## 31. SEO & Indexing Infrastructure (Implemented)

### Components Added
- **SEO Plugin**: Integrated `@payloadcms/plugin-seo` for Pages collection (auto-added `meta` group: title, description, image fields).
- **Dynamic Metadata**: `generateMetadata` implemented for dynamic page routes and farm detail pages; builds standard meta + Open Graph + Twitter card + canonical.
- **Canonical URLs**: Added via `alternates.canonical` in metadata objects (Home, Farms index, Farm detail, and dynamic Pages).
- **Sitemap Generator**: `app/sitemap.ts` returns an array (Next.js App Router format) enumerating static roots, published Pages, and Farms.
- **Robots.txt Route**: `app/robots.txt/route.ts` serves crawl directives and references sitemap.
- **Utility**: `getSiteURL()` centralizes base URL formatting (used across metadata, sitemap, robots).

### Metadata Structure Example
```ts
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: page.meta?.title || page.name,
    description: page.meta?.description || fallback,
    alternates: { canonical: base + pathname },
    openGraph: { title, description, images },
    twitter: { title, description, images: images?.map(i => i.url), card: 'summary' },
  }
}
```

### Benefits
- Eliminates duplicate content ambiguity (canonical).
- Improves discoverability and indexing speed (sitemap + robots reference).
- Enriches social sharing previews (OG/Twitter images derived from SEO image field).
- Centralized base URL logic reduces drift across features.

### Future Enhancements (Deferred)
- Structured data (JSON-LD) for Farms (`LocalBusiness`) and Products (`Product` with Offers).
- Multi-language `hreflang` alternates.
- Per-collection sitemap splitting if scale demands.
- Image optimization pipeline signals (dimensions, mime) in OG tags.

This README favors completeness over brevity while eliminating redundant duplication. Each major system (installation, styling, data modeling, slug pipeline, dynamic rendering, future user roles & commerce features) is documented once in a dedicated section. Update types after schema changes (`pnpm payload generate:types`) before adjusting client components.

Ongoing documentation: keep this file updated as roadmap items are delivered.

## 32. Recent Updates (Changelog)

### 2023-10-10
- **Feature**: Implemented dynamic Home page variant selection via `home-config` global.
- **Feature**: Added SEO metadata generation and sitemap/robots integration.
- **Fix**: Resolved hydration mismatch in auth state by removing `localStorage` reliance.
- **Fix**: Eliminated redundant "Only admins can change the owner" errors by decoupling update authorization from input payload.

### 2023-09-25
- **Feature**: Integrated TanStack Query for client state management.
- **Feature**: Added authentication helpers (`login`, `logout`, `getUser`) for server actions.
- **Fix**: Adjusted `beforeChange` hook logic for farm ownership to allow admin overrides.

### 2023-09-10
- **Feature**: Initial commit with Next.js, Payload CMS, TailwindCSS, and HeroUI setup.
- **Feature**: Basic farm and product listing pages.

---

## 33. Roadmap / TODO (Always Last)
Core Content & Routing:
- [ ] Implement catch‑all route `[[...segments]]` resolving by `pages.pathname` for dynamic hierarchical page rendering.
- [ ] RichText renderer (Lexical) for Farms / Products / Home sections.

Type & Performance:
- [ ] Strong types for client components (remove `any` in `FarmDetail`, `Farms`).
- [ ] Caching & revalidation strategy (e.g. tag-based invalidation, `revalidateTag`).

Products & Commerce:
- [ ] Product variant system (if future granularity required: size, packaging, seasonal availability).
- [ ] Shopping cart model (session + persistent) scoped per farm or aggregated; evaluate multi-farm constraints.

User Authentication (NEW):
- [ ] Public user auth separate from admin (new `publicUsers` or extend `users` with role field).
- [ ] Role-based access: `farmOwner` can CRUD its own Farm + inventory lines; `customer` can create carts & orders.
- [ ] Ownership enforcement via access control hooks (e.g., match user ID to `farm.owner`).

Cart & Orders (NEW):
- [ ] `carts` collection: { user, farm, items[{ product, quantity, unit, priceSnapshot }], status }.
- [ ] Validation hook: ensure items' farm matches cart.farm.
- [ ] Price snapshot field to preserve historical pricing.

Map & Geolocation (NEW):
- [ ] Add geolocation fields to Farms: { latitude, longitude } or GeoJSON point.
- [ ] Map component (Leaflet or Mapbox GL) plotting farm markers.
- [ ] Optional clustering & distance filtering.

UI Enhancements:
- [ ] Additional blocks: Gallery, FAQ, Map, Pricing table.
- [ ] Accessible focus states & improved color contrast audit.

Testing & Quality:
- [ ] Expand E2E to cover farm listing & detail pages.
- [ ] Add integration tests for slug duplication & nested docs path sync.
- [ ] Add snapshot tests for new blocks.

---



