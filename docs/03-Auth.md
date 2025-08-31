# Authentication & Authorization

## Collections
- `admins`: Panel-only. Not treated as logged-in app user in frontend UI.
- `users`: App-facing accounts with `role` (`farmer` | `customer`).

## Session Handling
- Cookie (`payload-token`) HTTP-only set by Payload during login server action.
- Server components read session via `payload.auth({ headers })`.
- Client obtains current user via `useAuth` (React Query fetch to `/api/users/me`).

## Server Actions
- `login`, `logout`, `register` manage authentication state.
- Mutations invalidate `['user']` query cache.

## Access Control Patterns
- Collection access functions check: `req.user?.collection === 'users'` and role.
- Farmers limited to CRUD only their farm.
- Customers restricted from modifying farms/products.

## Security Advantages
- No localStorage tokens.
- Role checks centralized.
- Data hydration minimized.

## Future Improvements (Deferred)
- Server-side hydration of auth query.
- Magic link / passwordless.
- Audit logs for ownership transfer.

---
Next: `04-Cart.md` for cart subsystem documentation.
