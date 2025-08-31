# Cart Subsystem (Customer Carts)

Comprehensive documentation of cart implementation (previously missing in README).

## Overview
Carts let a customer (user with role `customer`) collect items per farm. Each (user,farm) pair has at most **one active cart** (status `active`). Price & unit are snapshotted when an item is added to preserve historical pricing if product price later changes.

## Design Goals
- Preserve historical `priceSnapshot` per line.
- Simplicity: one cart per farm, one line per product (aggregate quantity).
- Stock safety: cannot exceed farm inventory `stock`.
- Server-authoritative: no client-side business logic; server actions enforce constraints.

## Data Shapes
### Farm Inventory Entry (`farm.products[]`)
```
{
  product: ProductRef,
  quantity: number,   // bundle size (e.g. 5 kg per bundle)
  unit: string,       // 'kg' | 'pcs' | 'liters' | 'boxes'
  price: number,      // price per bundle
  stock: number       // available bundles
}
```
### Cart Document
```
{
  user: UserRef,
  farm: FarmRef,
  status: 'active' | 'ordered' | 'cancelled',
  items: [
    {
      product: ProductRef,
      quantity: number,         // bundles in cart
      unit: string,             // copied from farm entry at add
      priceSnapshot: number     // copied from farm entry at add
    }
  ]
}
```

### Derived `CartDTO` (Returned to Client)
```
{
  id: string,
  farmId: string,
  farmName: string,
  lines: [
    {
      id: string,
      productId: string,
      productName: string,
      bundleSize: number,
      unit: string,
      bundles: number,
      priceEach: number,
      subtotal: number
    }
  ],
  total: number
}
```

## Server Actions (`cartActions.ts`)
| Action | Purpose | Key Validations |
|--------|---------|-----------------|
| `addToCart` | Add new product line or increment existing | Auth is customer; farm & product exist; product belongs to farm; not exceeding stock; positive bundles |
| `decrementCartItem` | Decrease quantity or remove line; delete cart if last line removed | Auth owner; item exists; amount > 0 |
| `clearAllCarts` | Remove all active carts for user | Auth is customer |
| `getCart` | Fetch single farm cart | Auth customer; returns null if none |
| `getAllCarts` | Fetch all active carts | Auth customer |

### Snapshot Logic
`priceSnapshot` and `unit` are copied from farm inventory at time of add. Subsequent farm price/unit changes do **not** mutate existing cart lines (ensures price integrity).

### Stock Enforcement
On add or increment: `newQty <= stock`. Server rejects overflow; client shows error via thrown message.

## Serialization Pipeline
1. Base lines built (`baseSerialize`) from cart + associated farm.
2. Missing product names resolved by `fillMissingProductNames` (extra fetch only if needed).
3. Final `CartDTO` computed with aggregated `total`.

## React Query Hooks (`useCarts.ts`)
- `useAllCarts()` query key `['carts']` → GET `/cart/api` returns `{ carts: CartDTO[] }`.
- `useCartTotals()` derives totals (sum lines + bundles) from cached carts.
- `useAddToCart()` POST `/cart/api/add` then invalidates `['carts']`.
- `useDecrementItem()` POST `/cart/api/decrement` invalidates `['carts']`.
- `useClearCarts()` POST `/cart/api/clear` invalidates `['carts']`.

All mutations rely on server validation; optimistic updates deferred for simplicity.

## API Routes (Edge / RSC Compatible)
```
/cart/api          (GET)  -> getAllCarts
/cart/api/add      (POST) -> addToCart { farmId, productId, bundles? }
/cart/api/decrement(POST) -> decrementCartItem { cartId, productId, amount? }
/cart/api/clear    (POST) -> clearAllCarts
```

## UI Integration
### Product Add (FarmDetail excerpt)
```tsx
const { mutate: add, isPending } = useAddToCart()
<Button
  isDisabled={isPending || (p.stock ?? 0) <= 0}
  onPress={() => add({ farmId: farm.id, productId: prod!.id })}
>
  Add
</Button>
```

### Sidebar / Cart Display
Displays each active cart grouped by farm, line subtotals, overall grand total, decrement buttons and clear-all control.

## Edge Cases
- Deleting last line auto-deletes cart (returns `null` from decrement).
- Product removed from farm later: name fallback fetch may fail; line still shows productId.
- Stock reduced below current cart quantity: not reconciled automatically (future improvement → validation on checkout).

## Error Handling
Server actions throw `Error` → API route catches and returns `{ error }` JSON with status 400/500. Client mutations surface error message (can be surfaced in UI toast).

## Future Enhancements
- Checkout flow creating `orders` collection; cart status transition to `ordered`.
- Optimistic updates with rollback on error.
- Soft stock reservations.
- Discount / promotion lines.
- Combined multi-farm checkout (currently isolated per farm intentionally).

---
Next: `05-Mapping.md` for Mapbox integration.
