<div align="center">

# Farmshop Finder (Next.js + Payload CMS)

Discover local farms, their products, and manage structured content dynamically. Built with **Next.js App Router**, **Payload CMS**, **TailwindCSS v4**, **HeroUI**, **S3 storage**, and **Brevo (email)**.

</div>

## Table of Contents
1. Overview & Goals
2. Tech Stack Summary
3. Project Structure
4. Installation & Initial Setup
5. TailwindCSS Integration (Full Steps)
6. HeroUI Integration & Client Components
7. Data Model (Collections & Globals)
8. Slug & Hierarchical URL Pipeline
9. Frontend Rendering Pattern (Server vs Client)
10. Dynamic Home Variant Selection
11. Farms & Products Domain (Data + UI)
12. Page Builder (Blocks) & Versioning
13. Utilities & Infrastructure (S3, Email, Helpers)
14. Styling Conventions
15. Testing (Vitest + Playwright)
16. Commands Reference
17. Deployment (Vercel)
18. Roadmap / TODO
19. Quick Code Examples
20. Authentication & Access Control (Implemented)
21. SEO & Indexing Infrastructure (Implemented)
22. Final Notes

---

## 1. Overview & Goals
Editors can:
- Manage multiple experimental Home page variants.
- Build hierarchical pages with content blocks.
- Define a master catalog of Products.
- Associate Products to Farms with per-farm inventory (quantity, unit, price).
- (Planned) Provide public user accounts, farm owner editing, customer carts, and a geographical map of farms.

Design principles:
- Separation of concerns (fetch in Server Components, UI in Client Components when necessary).
- Reusable slug + path derivation for hierarchical content.
- Extensible blocks architecture for Pages.
- Clear metadata separation (segment slug vs full pathname).

---

## 2. Tech Stack Summary
- Next.js (App Router, React Server Components, ISR / revalidate usage potential).
- Payload CMS (Lexical rich text, nested docs plugin, drafts/versioning, S3 storage plugin).
- TailwindCSS v4 + HeroUI for UI styling & components.
- MongoDB via mongoose adapter.
- S3-compatible object storage for media (configurable endpoint).
- Brevo email adapter (password resets, notifications, future transactional messages).

---

## 3. Project Structure
```
src/
  payload.config.ts            # Central configuration (collections, globals, plugins)
  collections/                 # Users, Media, Pages, Products, Farms, Home
  globals/                     # Header, Footer, HomeConfig
  fields/slug/                 # Slug factory + hooks (format & duplicate logic)
  app/(frontend)/              # Next.js routes & layout, providers, styles
    blocks/                    # Block schemas (Cover, RichText, Image)
    components/                # Client components (FarmDetail, Farms, Navbar, Footer, etc.)
    farms/                     # Farm listing & dynamic farm detail routes
  utils/                       # brevoAdapter, generateId, deepMerge, misc helpers
tests/                         # Vitest (integration) & Playwright (E2E)
```

Key separation:
- Server route files (`page.tsx`) perform async data fetching.
- Client components (`'use client'`) encapsulate interactivity / HeroUI elements.

---

## 4. Installation & Initial Setup
Clone & environment:
```bash
git clone <repo-url>
cd farmshop-finder-test
cp .env.example .env   # then fill required variables
pnpm install
pnpm dev
```
Visit: http://localhost:3000 and create the first admin user in the Payload admin UI.

Docker (optional) for Mongo:
```bash
docker-compose up -d
# Ensure DATABASE_URI / MONGODB_URI matches docker-compose service settings
```

---

## 5. TailwindCSS Integration (Full Steps)
1. Install deps:
```bash
pnpm install tailwindcss @tailwindcss/postcss postcss
```
2. Approve platform builds (oxide):
```bash
pnpm approve-builds
```
3. PostCSS config (`postcss.config.mjs`):
```js
const config = { plugins: { '@tailwindcss/postcss': {} } }
export default config
```
4. Import Tailwind in `src/app/(frontend)/styles.css`:
```css
@import 'tailwindcss';
```
5. Verify by adding a test element with Tailwind utility classes in a page.

---

## 6. HeroUI Integration & Client Components
Install:
```bash
pnpm install @heroui/react framer-motion
pnpm approve-builds
```
Optional `.npmrc` hoisting (already set if needed):
```
public-hoist-pattern[]=@heroui/*
```
`hero.ts` (Tailwind plugin reference):
```ts
import { heroui } from '@heroui/react'
export default heroui()
```
Add to `styles.css`:
```css
@plugin './hero.ts';
@source '../../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}';
@custom-variant dark (&:is(.dark *));
```
Provider:
```tsx
'use client'
import { HeroUIProvider } from '@heroui/react'
export function Providers({ children }: { children: React.ReactNode }) {
  return <HeroUIProvider>{children}</HeroUIProvider>
}
```
Wrap body in layout with `<Providers>` so all client components have context.

Server vs Client: Only mark UI pieces using state/effects/HeroUI as client.

---

## 7. Data Model (Collections & Globals)

| Type | Name | Purpose |
|------|------|---------|
| Global | Header | Editable navigation items & branding |
| Global | Footer | Editable footer content |
| Global | HomeConfig | Pointer to active Home variant |
| Collection | Home | Multiple landing page variants |
| Collection | Pages | Hierarchical page builder (blocks) |
| Collection | Products | Master product catalog |
| Collection | Farms | Farm entities + product inventory linkage |
| Collection | Media | Asset uploads (S3) |
| Collection | Admins | Admin panel only (separate auth collection) |
| Collection | Users | Frontend end-users (`farmer`, `customer`) |

Farms excerpt:
```ts
{ name: 'products', type: 'array', fields: [
  { name: 'product', type: 'relationship', relationTo: 'products', required: true },
  { name: 'quantity', type: 'number', min: 0, defaultValue: 0 },
  { name: 'unit', type: 'select', options: ['kg','pcs','liters','boxes'], defaultValue: 'kg' },
  { name: 'price', type: 'number', min: 0, defaultValue: 0 },
]}
```

User model split (Admins vs Users):

We migrated from a single `users` collection with an `admin` role to two separate auth-enabled collections for clearer security boundaries:

1. `admins` — ONLY for Payload admin panel access.
2. `users`  — Application end‑users (`farmer`, `customer`).

Key reasons:
- Prevent accidental front‑end assumptions about an `admin` behaving like an app user.
- Easier to hard‑gate front‑end UI by `user.collection === 'users'`.
- Reduced risk of privilege escalation via mixed-role documents.

Admins collection:
```ts
export const Admins: CollectionConfig = {
  slug: 'admins',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [
    { name: 'name', type: 'text', required: true },
  ],
}
```

Users collection:
```ts
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email', description: 'App users (farmer | customer)' },
  fields: [
    { name: 'role', type: 'select', required: true, options: [
        { label: 'Farmer', value: 'farmer' },
        { label: 'Customer', value: 'customer' },
      ] },
    { name: 'name', type: 'text', required: true },
  ],
}
```

Front‑end auth logic explicitly ignores authenticated `admins` (treats them as guest in public UI) by checking the `collection` property returned by `payload.auth`.

Farms access (owner + role based):
```ts
access: {
  create: ({ req: { user } }) => !!user && user.role === 'farmer',
  read: () => true,
  update: ({ req: { user }, data }) => !!user && user.role === 'farmer' && user.id === data.owner,
  delete: ({ req: { user }, data }) => !!user && user.role === 'farmer' && user.id === data.owner,
},
fields: [
  // ...
  { name: 'owner', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
]
```

Products excerpt (access ties into farm ownership via embedded relationship path):
```ts
{ name: 'productType', type: 'select', options: ['produce','dairy','meat','poultry'], required: true }
```

Pages: `layout` (blocks array) + slug + derived `pathname`.

---

## 8. Slug & Hierarchical URL Pipeline
Goal: Reusable segment slug per node; independent globally unique `pathname` for routing & SEO.

Steps:
1. `slug()` field factory adds text field with hooks.
2. `formatSlug` normalizes value (unless `/`).
3. `beforeDuplicate` ensures unique derivative via `generateId()`.
4. `nestedDocsPlugin` builds breadcrumbs & composed URL.
5. `syncPathname` copies final breadcrumb URL to `pathname` field (unique, indexed, read-only).

Key code (simplified):
```ts
beforeValidate: [formatSlug(fieldToUse)]
beforeDuplicate: [({ value }) => value === '/' ? generateId() : `${value}-${generateId()}`]
```
URL builder:
```ts
generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`.replace(/^\/+/,'/'), '')
```
Sync hook:
```ts
if ((operation==='create'||operation==='update') && data?.breadcrumbs?.at(-1)?.url !== value) {
  return data?.breadcrumbs?.at(-1)?.url || ''
}
```
Example: About (/about) -> Team (/about/team). Duplicate Team -> team-<randomId>.

---

## 9. Frontend Rendering Pattern (Server vs Client)
Pattern:
1. Server page: fetch via `getPayload({ config })`.
2. Pass sanitized data to client component.
3. Client component handles presentation with HeroUI.

Example (farm index excerpt):
```tsx
const farms = await payload.find({ collection: 'farms', limit: 100 })
return farms.docs.map(f => <Farms key={f.id} farmName={f.name} farmSlug={f.slug ?? f.id} farmImage={f.farmImage} farmLocation={f.location} farmId={f.id} />)
```

---

## 10. Dynamic Home Variant Selection
Mechanism:
1. `home-config` global stores relationship to active Home doc.
2. Resolve ID or object form.
3. Fetch all `home` docs & match by identifying key (`heroinfo`).
4. Render hero, bigSection, sectionA, sectionB, btImages[].

Code snippet:
```ts
const homeConfig = await payload.findGlobal({ slug: 'home-config', depth: 1 })
const key = typeof homeConfig.activeHome === 'object' ? homeConfig.activeHome.heroinfo : homeConfig.activeHome
const all = await payload.find({ collection: 'home', depth: 1 })
const active = all.docs.find(d => d.heroinfo === key)
```

---

## 11. Farms & Products Domain (Data + UI)
Listing `/farms`: responsive grid (1 -> 2 columns) using card height 350px.

Detail `/farms/[slug]` uses Next.js params Promise pattern (Next 15) to avoid warnings:
```tsx
export default async function FarmDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const farm = await getFarmBySlugOrId(slug)
  if (!farm) return notFound()
  return <FarmDetail farm={farm} />
}
```
`FarmDetail` (client) renders hero + product cards. RichText description placeholders will be replaced with a Lexical renderer.

Inventory modeling: `farms.products[]` defines per-farm pricing & quantity; avoids duplicating product base data.

---

## 12. Page Builder (Blocks) & Versioning
Pages collection:
- Blocks: Cover, RichText, Image.
- Drafts with autosave (100ms).
- Up to 50 versions per doc for rollback.

Future blocks (planned): Gallery, FAQ, Map embed, Pricing table.

---

## 13. Utilities & Infrastructure (S3, Email, Helpers)
### S3 Storage
Configured through `@payloadcms/storage-s3` (media collection). `forcePathStyle: true` supports MinIO / custom endpoints.

### Brevo Email Adapter (`utils/brevoAdapter.ts`)
- Sends transactional emails; if `BREVO_EMAILS_ACTIVE` unset logs to console instead.
- Wraps Axios POST to Brevo API.

### Slug Utilities
### Authentication Helpers (NEW)
- `login` server action: delegates to `payload.login`, sets HTTP-only `payload-token` cookie.
- `logout` server action: deletes `payload-token` cookie.
- `getUser` server action: wraps `payload.auth({ headers })` to resolve current user for server components.
- Dynamic navbar receives `user` from `HeaderServer` (server component) instead of reading `localStorage` (removed). This avoids hydration mismatch and keeps auth trust anchored on secure cookie.

### Site URL Utility (NEW)
- `getSiteURL()` normalizes a base site URL (trims trailing slash) and is used to build canonical URLs, sitemap entries, robots reference—kept isolated so future multi‑tenant logic can plug in without touching rendering code.

- `slug()` field factory merges overrides using `deepMerge`.
- `formatSlug` ensures consistent casing & hyphenation.
- `generateId` uses crypto safe random base64url fragment.

### Environment Variables (core)
```
BREVO_API_KEY=...
BREVO_EMAILS_ACTIVE=true
BREVO_SENDER_NAME=...
BREVO_SENDER_EMAIL=...
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=...
DATABASE_URI=...
PAYLOAD_SECRET=...
```

---

## 14. Styling Conventions
- Tailwind utility-first; minimal custom CSS.
- HeroUI theming via Tailwind plugin registration.
- Consistent container widths: `xl:w-[calc(1280px*0.9)]` pattern for centered content.

---

## 15. Testing (Vitest + Playwright)
Integration (Vitest): simple API reachability test (`users` collection fetch). Extend with schema and hook unit tests.
E2E (Playwright): baseline homepage test (title & first heading). Needs update to reflect customized home content.

---

## 16. Commands Reference
```bash
pnpm dev                        # Start dev server
pnpm build                      # Next.js production build
pnpm test                       # Run Vitest + Playwright (if configured in scripts)
pnpm approve-builds             # Approve Tailwind/HeroUI native builds
pnpm payload generate:types     # Regenerate Payload TypeScript types
```

---

## 17. Deployment (Vercel) ✅ READY

**Status: ✅ Repository is deployment-ready for Vercel**

### Build Configuration
Build script (package.json):
```json
"build": "cross-env NODE_OPTIONS=\"--no-deprecation --max-old-space-size=8000\" next build"
```

### Environment Variables for Vercel Dashboard
Copy these environment variables to your Vercel project settings:

**Required:**
```
DATABASE_URI=your-mongodb-connection-string
PAYLOAD_SECRET=your-secure-secret-key
```

**S3 Storage (Required for media uploads):**
```
S3_BUCKET=your-s3-bucket-name
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_REGION=your-region
S3_ENDPOINT=your-s3-endpoint
```

**Brevo Email (Optional):**
```
BREVO_API_KEY=your-brevo-api-key
BREVO_EMAILS_ACTIVE=true
BREVO_SENDER_NAME=Your App Name
BREVO_SENDER_EMAIL=noreply@yourapp.com
```

### Deployment Steps:
1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy - Vercel will automatically run `npm run build`
4. Your app will be available at your Vercel-provided URL

### Build Status:
✅ **TypeScript compilation**: No errors  
✅ **ESLint linting**: No warnings  
✅ **Build artifacts**: Generated successfully  
✅ **Dynamic rendering**: Configured for database-dependent pages  
✅ **Type safety**: Proper Media type guards implemented  
✅ **Vercel config**: Optimized for deployment  
✅ **Ready for production deployment**

### Technical Notes:
- Pages requiring database access use `dynamic = 'force-dynamic'` for server-side rendering
- Type guards implemented for Media vs string types to prevent build errors
- All ESLint warnings resolved with proper TypeScript types
- Vercel configuration file included for optimal deployment settings

---

## 18. Roadmap / TODO
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

## 19. Quick Code Examples

### 19.1 Fetch Farms (Server Component)
```ts
import { getPayload } from 'payload'
import config from '@/payload.config'
export async function listFarms(limit = 50) {
  const payload = await getPayload({ config })
  return payload.find({ collection: 'farms', limit, depth: 1 })
}
```

### 19.2 Fetch Farm By Slug OR ID
```ts
async function getFarmBySlugOrId(slugOrId: string) {
  const payload = await getPayload({ config })
  const bySlug = await payload.find({ collection: 'farms', limit: 1, where: { slug: { equals: slugOrId } } })
  if (bySlug.docs[0]) return bySlug.docs[0]
  try { return await payload.findByID({ collection: 'farms', id: slugOrId }) } catch { return null }
}
```

### 19.3 Slug Field Factory
```ts
export const slug = (fieldToUse = 'title', overrides = {}) => deepMerge({
  name: 'slug', type: 'text', index: true, unique: true,
  hooks: { beforeValidate: [formatSlug(fieldToUse)] }
}, overrides)
```

### 19.4 Auth Server Actions (Login / Logout / Signup)
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

### 19.5 useAuth Hook (Client) Consumption
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

### 19.6 Mutation Pattern With Cache Invalidation
```tsx
import { useQueryClient } from '@tanstack/react-query'
import { login } from '@/app/(frontend)/login/actions/login'
const qc = useQueryClient()
async function onSubmit(form:{email:string;password:string}) {
  const r = await login(form)
  if (r.success) qc.invalidateQueries({ queryKey: ['user'] })
}
```

### 19.7 Protected Server Page Pattern
```ts
import { getPayload } from 'payload'; import config from '@/payload.config'; import { redirect } from 'next/navigation'
export default async function DashboardPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await import('next/headers').then(m=>m.headers()) })
  if (!user || user.collection !== 'users') redirect('/login')
  return <div>Dashboard for {user.email}</div>
}
```

### 19.8 Example Farmer-Only Create Farm Action
```ts
'use server'
import { getPayload } from 'payload'; import config from '@/payload.config'
export async function createFarm({ name, location }: { name: string; location?: string }) {
  const payload = await getPayload({ config })
  // NOTE: additional auth check (payload.auth) could be added if not called from already protected UI
  return payload.create({ collection: 'farms', data: { name, location } })
}
```

### 19.9 Admin vs User UI Filter
```tsx
const { user } = useAuth()
const isAppUser = user?.collection === 'users'
```

---

## 20. Final Notes
_(Section numbering shifted: original Final Notes moved to 22 after adding implemented Auth & SEO sections.)_

## 20. Authentication & Access Control (Implemented & Updated with React Query)

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

## 21. SEO & Indexing Infrastructure (Implemented)

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

## 23. Client State Management with TanStack Query & Auth Methodology

### Overview
We integrated **TanStack Query (@tanstack/react-query)** to manage client-side server state (current user session, future data lists) while retaining **Server Actions** / server utilities for privileged mutations and page-level protection. This yields: centralized caching, automatic revalidation, and clear separation of trust boundaries.

### Decision Matrix (What to use & When)
| Goal | Use | Why |
|------|-----|-----|
| Read data for UI (cache, refetch, share across components) | `useQuery` (TanStack Query) | Smart caching, deduped requests, background revalidation |
| Perform privileged mutation (login, logout, signup, create farm, etc.) | Server Action (`'use server'`) or API route + then `queryClient.invalidateQueries` | Runs only on server; protects secrets & business logic |
| Protect an entire page/segment (redirect if unauthorized) | Server component logic (`await payload.auth`) | Enforces access before rendering HTML |
| Combine initial server data + client hydration | Fetch on server, pass as initial data to `useQuery` (optional) | Avoid double fetch & preserve SSR SEO |

### Architectural Roles
1. **Server Actions / API routes**: Authority for writes & secure reads.
2. **TanStack Query**: Client orchestrator (caching, lifecycle, stale control).
3. **useAuth hook**: Single source of truth for current user on client.
4. **Protected layouts/pages**: Hard gate with server-side `payload.auth`.

### Core Auth Pieces
Query provider (`src/app/(frontend)/providers/queryProvider.tsx`):
```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  }))
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
```

Auth hook (`src/app/(frontend)/hooks/useAuth.ts`):
```ts
'use client'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@/payload-types'
export const useAuth = () => {
  const { data, isLoading, isError } = useQuery<(User & { collection: string }) | null>({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/users/me')
      if (!res.ok) return null
      const json = await res.json()
      return json.user
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
  return { user: data, isLoading, isError }
}
```

Navbar consumption (simplified):
```tsx
const { user } = useAuth()
return user && user.collection === 'users' ? <UserMenu /> : <AuthButtons />
```

### Server vs Client Auth Responsibilities
| Layer | Responsibility | Example |
|-------|----------------|---------|
| Server Page/Layout | Gate access, redirect unauth users | `if (!user) redirect('/login')` |
| Server Action | Mutate (login, signup, logout) | `await payload.login(...)` |
| Client (React Query) | Cache session / reflect UI | `useAuth()` |
| UI Component | Render conditionally | Show dropdown vs login/signup |

### Mutations + Cache Invalidation Pattern
Login action (server) example:
```ts
'use server'
import { getPayload } from 'payload'
import config from '@/payload.config'
export async function login({ email, password }: { email: string; password: string }) {
  const payload = await getPayload({ config })
  try {
    const res = await payload.login({ collection: 'users', data: { email, password } })
    return { success: true, user: res.user }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
```

Client form snippet:
```tsx
const qc = useQueryClient()
const onSubmit = async (data: FormValues) => {
  const r = await login(data)
  if (r.success) {
    qc.invalidateQueries({ queryKey: ['user'] })
    router.push('/dashboard')
  } else setError(r.error)
}
```

Logout pattern:
```tsx
await logout()        // server action clears cookie
queryClient.invalidateQueries({ queryKey: ['user'] })
```

### Admin vs User Handling
Because sessions can be created from `/admin` (Admins collection) and front‑end (Users collection), we filter on the client:
```ts
if (user?.collection !== 'users') return null  // treat as guest
```
This avoids exposing farmer/customer UI to panel-only accounts.

### When NOT to Use React Query
- Simple one-off server-rendered page (SSR) with no client reuse.
- Highly sensitive operations that should never hit a public API route (do work entirely in a server component / action and stream result).
- Static marketing sections (use build-time or edge caching instead).

### Progressive Enhancement Strategy
1. Start with a secure server action for a feature (authoritative logic).
2. Expose a read endpoint (if needed) for the client.
3. Add a `useQuery` hook wrapper (error/loading states centralized).
4. Layer mutations with invalidations.
5. Optimize stale times and prefetch where latency matters.

### Quick Reference Cheatsheet
| Task | Pattern |
|------|---------|
| Get current user (client) | `useAuth()` |
| Force refresh user cache | `queryClient.invalidateQueries({ queryKey: ['user'] })` |
| Login | Server action → invalidate `['user']` |
| Signup | Server action → invalidate `['user']` |
| Logout | Server action → invalidate `['user']` |
| Protect page | Server component + `payload.auth` + redirect |
| Show UI only to farmers | `user?.role === 'farmer'` (after confirming `user.collection === 'users'`) |

### Benefits Recap
- Eliminates prop drilling of `user`.
- Automatic freshness & background refetch.
- Clear boundary: server mutates, client renders.
- Extensible for future queries (farms list, products catalog) with minimal boilerplate.

### Future Enhancements
- Hydrate `useAuth` with `initialData` from a server layout for zero-latency first render.
- Add `useMutation` wrappers for structured mutation error handling.
- Introduce optimistic updates for cart interactions.

---
End of TanStack Query integration documentation.



#### Docker (Optional)

If you prefer to use Docker for local development instead of a local MongoDB instance, the provided docker-compose.yml file can be used.

To do so, follow these steps:

- Modify the `MONGODB_URI` in your `.env` file to `mongodb://127.0.0.1/<dbname>`
- Modify the `docker-compose.yml` file's `MONGODB_URI` to match the above `<dbname>`
- Run `docker-compose up` to start the database, optionally pass `-d` to run in the background.

## How it works

The Payload config is tailored specifically to the needs of most websites. It is pre-configured in the following ways:

### Collections

See the [Collections](https://payloadcms.com/docs/configuration/collections) docs for details on how to extend this functionality.

- #### Users (Authentication)

  Users are auth-enabled collections that have access to the admin panel.

  For additional help, see the official [Auth Example](https://github.com/payloadcms/payload/tree/main/examples/auth) or the [Authentication](https://payloadcms.com/docs/authentication/overview#authentication-overview) docs.

- #### Media

  This is the uploads enabled collection. It features pre-configured sizes, focal point and manual resizing to help you manage your pictures.

### Docker

Alternatively, you can use [Docker](https://www.docker.com) to spin up this template locally. To do so, follow these steps:

1. Follow [steps 1 and 2 from above](#development), the docker-compose file will automatically use the `.env` file in your project root
1. Next run `docker-compose up`
1. Follow [steps 4 and 5 from above](#development) to login and create your first admin user

That's it! The Docker instance will help you get up and running quickly while also standardizing the development environment across your teams.

## Questions

If you have any issues or questions, reach out to us on [Discord](https://discord.com/invite/payload) or start a [GitHub discussion](https://github.com/payloadcms/payload/discussions).

## TailwindCSS Setup with Payload

To set up TailwindCSS in this project with Payload, follow these steps:

1. **Install dependencies**:
   Run the following command to install the required dependencies:
   ```bash
   pnpm install tailwindcss @tailwindcss/postcss postcss
   ```

2. **Approve builds**:
   Approve `@tailwindcss/oxide` by running:
   ```bash
   pnpm approve-builds
   ```

3. **Generate import map**:
   Generate the import map with the following command:
   ```bash
   pnpm payload generate:importmap
   ```

4. **PostCSS configuration**:
   Create a `postcss.config.mjs` file in the project root with the following content:
   ```javascript
   const config = {
     plugins: {
       '@tailwindcss/postcss': {},
     },
   };
   export default config;
   ```

5. **Import TailwindCSS**:
   Add the following line to the `styles.css` file located in the `(frontend)` folder:
   ```css
   @import "tailwindcss";
   ```

6. **Test styles**:
   Verify that TailwindCSS is working correctly by adding the following code in `page.tsx`:
   ```tsx
   <div className="bg-gray-700 font-mono p-8 rounded-lg shadow-xl shadow-zinc-800">
     <h1 className="w-fit font-bold size-16">Test title</h1>
     <p>
       Lorem ipsum dolor sit amet consectetur adipisicing elit. Quaerat excepturi reiciendis nisi
       explicabo provident vitae amet blanditiis autem quo. Recusandae inventore eius optio
       laborum quis quam voluptas nesciunt, deleniti soluta.
     </p>
   </div>
   ```

With these steps, TailwindCSS should be correctly set up in your Payload project.

## HeroUI Integration with TailwindCSS and Next.js

Below are the steps taken to integrate HeroUI and TailwindCSS in the project's frontend, along with best practices for using client/server components in Next.js:

1. **Install HeroUI and required dependencies**:
   ```bash
   pnpm install @heroui/react framer-motion
   pnpm approve-builds # To approve HeroUI scripts
   ```

2. **.npmrc configuration**:
   Add the following line to ensure proper HeroUI installation:
   ```properties
   public-hoist-pattern[]=@heroui/*
   ```

3. **Update and sync dependencies**:
   - Run `pnpm install` to reinstall dependencies.
   - Update HeroUI to the latest version:
     ```bash
     npx heroui-cli@latest upgrade --all
     ```
   - Run `pnpm install` again to ensure compatibility.
   - Update `react-dom` and other dependencies if needed.

4. **HeroUI configuration**:
   - Create the `hero.ts` file in the `(frontend)` folder with:
     ```ts
     import { heroui } from '@heroui/react';
     export default heroui();
     ```

5. **Integration in the styles file**:
   - In `styles.css` add:
     ```css
     @import 'tailwindcss';
     @plugin './hero.ts';
     @source '../../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}';
     @custom-variant dark (&:is(.dark *));
     ```
   - Change the language mode of the file to Tailwind CSS in VS Code to avoid syntax errors.

6. **Global HeroUI Provider**:
   - Create the `providers.tsx` file in `(frontend)`:
     ```tsx
     'use client';
     import { HeroUIProvider } from '@heroui/react';
     export function Providers({ children }: { children: React.ReactNode }) {
       return <HeroUIProvider>{children}</HeroUIProvider>;
     }
     ```
   - Modify the `layout.tsx` file to wrap the content with `<Providers>` inside `<body>`.

7. **Best practices for client/server components in Next.js**:
   - Create a `components/` folder for reusable components.
   - Components using HeroUI or requiring `'use client'` should be in separate files and start with `'use client'`.
   - Keep components/pages using async logic or `'use server'` separate.
   - Import and use HeroUI components only in client-side files.

> **Note:** This separation is essential to avoid rendering errors and ensure proper functioning of HeroUI and other interactive components in Next.js App Router.

## Email Sending with Brevo (Sendinblue)

To enable email sending (e.g., password reset, notifications) using Brevo, follow these steps:

1. **Add the following variables to your `.env` file:**
   ```env
   BREVO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   BREVO_EMAILS_ACTIVE=true
   BREVO_SENDER_NAME=YourName
   BREVO_SENDER_EMAIL=your@email.com
   ```

2. **Create the Brevo adapter:**
   In `src/utils/brevoAdapter.ts`:
   ```ts
   import axios from 'axios';
   import { EmailAdapter, SendEmailOptions } from 'payload';

   const brevoAdapter = (): EmailAdapter => {
     const adapter = () => ({
       name: 'Brevo',
       defaultFromAddress: process.env.BREVO_SENDER_EMAIL as string,
       defaultFromName: process.env.BREVO_SENDER_NAME as string,
       sendEmail: async (message: SendEmailOptions): Promise<unknown> => {
         if (!process.env.BREVO_EMAILS_ACTIVE) {
           console.log('Emails disabled, logging to console');
           console.log(message);
           return;
         }
         try {
           const res = await axios({
             method: 'post',
             url: 'https://api.brevo.com/v3/smtp/email',
             headers: {
               'api-key': process.env.BREVO_API_KEY as string,
               'Content-Type': 'application/json',
               Accept: 'application/json',
             },
             data: {
               sender: {
                 name: process.env.BREVO_SENDER_NAME as string,
                 email: process.env.BREVO_SENDER_EMAIL as string,
               },
               to: [
                 { email: message.to },
               ],
               subject: message.subject,
               htmlContent: message.html,
             },
           });
           console.log('Email sent successfully');
           return res.data;
         } catch (error) {
           console.error('Error sending email with Brevo:', error);
           throw error;
         }
       },
     });
     return adapter;
   };
   export default brevoAdapter;
   ```

3. **Install axios dependency:**
   ```bash
   pnpm add axios
   ```

4. **Configure Payload to use the adapter:**
   In `src/payload.config.ts`:
   ```ts
   import brevoAdapter from './utils/brevoAdapter';
   // ...
   export default buildConfig({
     // ...
     email: brevoAdapter(),
     // ...
   });
   ```

With this setup, all emails sent by Payload will use your Brevo account. Make sure not to commit your real API keys to version control.

## S3 Storage Setup

To configure S3 storage for media uploads in this project, follow these steps:

1. **Install the S3 Storage Plugin**:
   Ensure the `@payloadcms/storage-s3` package is installed. This is already included in the project dependencies.

2. **Set Up Environment Variables**:
   Add the following variables to your `.env` file:
   ```env
   S3_BUCKET=<your-s3-bucket-name>
   S3_ACCESS_KEY_ID=<your-access-key-id>
   S3_SECRET_ACCESS_KEY=<your-secret-access-key>
   S3_REGION=<your-region>
   S3_ENDPOINT=<optional-custom-endpoint>
   ```

3. **Update Payload Configuration**:
   The `payload.config.ts` file is already configured to use the S3 storage plugin. Ensure the following plugin configuration exists:
   ```typescript
   import { s3Storage } from '@payloadcms/storage-s3';

   s3Storage({
     collections: {
       media: {
         prefix: 'media',
       },
     },
     bucket: process.env.S3_BUCKET,
     config: {
       credentials: {
         accessKeyId: process.env.S3_ACCESS_KEY_ID,
         secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
       },
       region: process.env.S3_REGION,
       endpoint: process.env.S3_ENDPOINT,
       forcePathStyle: true, // Required for some S3-compatible services
     },
   });
   ```

4. **Test the Integration**:
   Upload a media file through the Payload admin panel and verify it appears in your S3 bucket.

## Front-End and Payload Integration

To integrate Payload CMS with the front-end:

1. **Fetch Global Data**:
   Use the `getPayload` function to fetch global data, such as the `header` and `footer` configurations. Example:
   ```typescript
   import { getPayload } from 'payload';
   import config from '@payload-config';

   const payload = await getPayload({ config });
   const header = await payload.findGlobal({ slug: 'header', depth: 1 });
   ```

2. **Pass Data to Components**:
   Pass the fetched data as props to your React components. For example, the `NavbarCP` component:
   ```tsx
   <NavbarCP
     title={header.title}
     logoUrl={header.logo.url}
     logoAlt={header.logo.alt}
     navItems={header.nav.map((item) => ({
       id: item.id,
       label: item.label,
       link: item.link,
     }))}
   />
   ```

3. **Dynamic Rendering**:
   Ensure components like `NavbarCP` and `Footer` dynamically render content based on the data passed from Payload.

4. **Test the Integration**:
   Run the application locally and verify that the header, footer, and other dynamic content are rendered correctly.

## Dynamic Home Page Selection

To render a specific "Home" document chosen via the `home-config` global, you can filter your collection on the client/server component:

```ts
// 1. Fetch the active Home entry from the global config
const { activeHome } = await payload.findGlobal({
  slug: 'home-config',
  depth: 1,
});

// 2. Extract the identifying field (e.g., `heroinfo`)
const activeKey = activeHome.heroinfo;

// 3. Fetch all Home docs
const homeData = await payload.find({
  collection: 'home',
  depth: 1,
});

// 4. Find the matching document by the key
const selectedHome = homeData.docs.find(doc => doc.heroinfo === activeKey);

// 5. Use its values in your component
console.log(selectedHome?.hero.title);
```

## Deployment

### Vercel Deployment

This project is ready for deployment on Vercel. All TypeScript errors and ESLint warnings have been resolved.

#### Prerequisites for Vercel Deployment:

1. **Environment Variables**: Configure the following environment variables in your Vercel project dashboard:
   ```
   DATABASE_URI=your-mongodb-connection-string
   PAYLOAD_SECRET=your-secure-secret-key
   S3_BUCKET=your-s3-bucket-name
   S3_ACCESS_KEY_ID=your-access-key-id
   S3_SECRET_ACCESS_KEY=your-secret-access-key
   S3_REGION=your-region
   S3_ENDPOINT=your-s3-endpoint
   ```

2. **Build Configuration**: The project uses Next.js with the following build script:
   ```json
   "build": "cross-env NODE_OPTIONS=\"--no-deprecation --max-old-space-size=8000\" next build"
   ```

3. **Memory Requirements**: The build process requires increased memory allocation (8GB) for optimal performance.

#### Deployment Steps:

1. Connect your repository to Vercel
2. Configure the environment variables in the Vercel dashboard
3. Deploy - Vercel will automatically run `npm run build`
4. Your app will be available at your Vercel-provided URL

#### Build Status:
✅ TypeScript compilation: No errors  
✅ ESLint linting: No warnings  
✅ Build artifacts generated successfully  
✅ Ready for production deployment

---

## Extended Project Documentation (Custom Features Implemented)

This section documents all custom work added beyond the starter template.

### 1. Dynamic Header & Footer (Globals)
Globals: `Header`, `Footer` provide editable navigation and site footer content via Payload admin.
Usage pattern:
1. Server component fetches global with `payload.findGlobal({ slug: 'header' })`.
2. Passes normalized props into a client component (e.g. `NavbarCP`).
3. Footer follows the same model.

### 2. Home Collection + Active Home Global Selector
- Collection `home` stores variants of the landing page (hero, sections, images array `btImages`).
- Global `home-config` contains a relationship to the active Home record.
- Runtime flow:
  - Fetch global → extract `activeHome` reference (may resolve to object or ID).
  - Fetch all Home docs, match by identifying field (`heroinfo`).
  - Render hero, bigSection, sectionA, sectionB, and background images.
- Benefits: Multiple experimental home layouts; switch instantly via admin.

### 3. Rich Page Builder with Nested Hierarchy (Pages Collection)
File: `src/collections/Pages.ts`
Features:
- Blocks field `layout` with blocks: Cover, RichText, Image (extensible).
- Drafts & versioning enabled (autosave interval 100ms, `maxPerDoc: 50`).
- Custom slug system (non-unique per segment) + hierarchical URL & pathname.
- Uses `nestedDocsPlugin` to manage tree, breadcrumbs, and full URL.
- Hook `syncPathname` mirrors the last breadcrumb URL to a read-only, globally unique `pathname` field.

Slug Pipeline Overview:
1. `slug('name', { unique: false })` creates a text field with hooks.
2. `formatSlug` (beforeValidate) normalizes new or changed slug or auto-derives from `name`.
3. `beforeDuplicate` hook appends random ID (or replaces `/`) to avoid collisions on duplication.
4. `nestedDocsPlugin` builds hierarchical URL (`generateURL`), including root `/`.
5. `syncPathname` copies breadcrumbs tail URL into `pathname` for uniqueness & indexing.

Advantages:
- Hierarchical navigation; future-proof for catch‑all routes.
- Stable SEO-friendly `pathname` separate from editable segment slug.

### 4. Farms & Products Data Model

Collections added: `products`, `farms`.

`Products` fields:
- name (text)
- productType (select: produce, dairy, meat, poultry)
- productImage (upload → media)
- description (richText) [placeholder currently not rendered]

`Farms` fields:
- name, slug (auto from name)
- tagline, location
- farmImage (upload)
- description (richText) [placeholder in UI]
- products (array): each entry { product (relationship), quantity, unit (select), price }

Design Rationale:
- Farm→Products is many-to-many via array entries referencing base product + per-farm inventory info (quantity, price, unit).
- Avoids duplicating product master data.

### 5. Farms Front-End Implementation
Routes:
- `/farms` index page: server component fetches farms (limit 100) and renders grid (1 col mobile, 2 cols md+). Each card uses client component `Farms` (HeroUI card) with fixed height.
- `/farms/[slug]` detail page: server component loads farm by slug (fallback ID). Passes data to client component `FarmDetail` for HeroUI rendering.

`FarmDetail` component features:
- Hero card with farm image, name, tagline, location.
- Placeholder area: `tu descripcion aqui (richText farm pendiente)`.
- Products gallery grid (1 / 2 / 3 responsive) showing product image, name, variantKey (future), quantity, price, and product description placeholder.

### 6. Client vs Server Component Strategy
- Data fetching isolated to server components (`page.tsx` files) to leverage async without `'use client'` overhead.
- Presentation with interactivity uses client components (`Navbar`, `Footer`, `Farms`, `FarmDetail`).
- Avoid dynamic import for client components unless code-splitting beneficial (removed `next/dynamic` with `ssr:false` after Next.js restriction warning).

### 7. Home Page Rendering Flow (Current)
1. Fetch `home-config` global.
2. Resolve `activeHome` identifier safely (object vs ID).
3. Fetch all home docs and match against `heroinfo`.
4. Render hero (Card + background image), CTA button, large section, two sub sections, and bottom trio of images via `btImages`.

### 8. Slug Utilities & Helpers
Files:
- `src/fields/slug/slug.ts` → factory for slug field (deep merge pattern, hooks, duplicate logic).
- `src/fields/slug/hooks/formatSlug.ts` → normalization using `standard-slugify` respecting `/` root slug.
- `generateId` → crypto-based short ID appended on duplication.
- `deepMerge` → stable override mechanism for field configuration.

Edge Cases Covered:
- Root home slug `'/'` preserved.
- Duplicate prevention vs. dynamic generation.
- Breadcrumb changes propagate to `pathname` automatically.

### 9. Media Handling (S3)
- `@payloadcms/storage-s3` configured with bucket prefix `media` scoped to `media` collection only.
- `forcePathStyle` enabled for compatibility with alternative S3 providers / local dev endpoints.

### 10. Email Adapter (Brevo)
- Custom adapter logs when disabled via `BREVO_EMAILS_ACTIVE` unset/false.
- Centralized in `brevoAdapter.ts` and attached in `email` config.

### 11. Versioning & Drafts (Pages)
- Autosave active → rapid iteration in block editor.
- Up to 50 prior versions retained for rollback/testing.

### 12. Styling & UI Libraries
- TailwindCSS v4 pipeline with HeroUI plugin integration in `styles.css`.
- HeroUI components separated into client modules; shared layout uses provider wrapper.

### 13. Pending / Future Enhancements
- Implement catch‑all page route (`[[...segments]]`) resolving by `pathname` for nested Pages.
- RichText rendering (farm + product descriptions + Home sections) with Lexical renderer.
- Type strengthening in client components (replace `any` in `FarmDetail` / `Farms`).
- Add variant system to Products (currently simplified; earlier variant scaffold replaced by lean model).
- Caching strategy for frequently read globals (potential edge runtime optimization).

### 14. Troubleshooting Notes
- Warning about `params.slug` resolved by awaiting `params` as a Promise in dynamic route (Next.js 15 pattern).
- Removed unsupported `next/dynamic` with `ssr:false` in server route to fix build error.
- Ensure to regenerate types after schema changes: `pnpm run generate:types`.

### 15. Commands Reference
```bash
# Regenerate Payload types
pnpm run generate:types

# Run dev server
pnpm dev

# Run tests (int + e2e)
pnpm test

# Approve Tailwind / HeroUI builds
pnpm approve-builds
```

### 16. Data Fetch Snippets
Get farms:
```ts
const payload = await getPayload({ config })
const farms = await payload.find({ collection: 'farms', limit: 50, depth: 1 })
```

Get single farm by slug fallback ID:
```ts
const bySlug = await payload.find({ collection: 'farms', where: { slug: { equals: slug } }, limit: 1 })
const farm = bySlug.docs[0] || await payload.findByID({ collection: 'farms', id: slug })
```

---

This extended documentation will continue to evolve as more features (nested page routing, rich text rendering, product variants) are implemented.



