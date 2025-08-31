# Data Model (Collections & Globals)

Summarizes schema definitions (refer to `src/collections/*.ts`).

## Collections
- **admins**: Auth for Payload admin UI only.
- **users**: App users with `role` (`farmer | customer`).
- **farms**: Single farm per farmer, holds `products[]` inventory sub-array.
- **products**: Base product catalog entries.
- **carts**: Active shopping carts tying user + farm + line items.
- **pages**: Hierarchical marketing/content pages (nested docs plugin).
- **media**: Uploads (S3 storage plugin).
- **home**: Home page variants.

## Globals
`header`, `footer`, `home-config` (choose active home variant).

## Inventory Shape (farm.products[])
```
{
  product: relation(Product),
  quantity: number (bundle size),
  unit: 'kg'|'pcs'|'liters'|'boxes',
  price: number (current price per bundle),
  stock: number (available bundles)
}
```

## Cart Items (carts.items[])
Stored snapshot of unit + price at add time (`priceSnapshot`), not live price.

## Slugs & Pathnames
Pages generate nested `pathname` distinct from the editable title → stable URLs.

## Ownership Enforcement
Farm create: auto-assign owner (farmer). Update/delete restricted to owner or admin.

---
Next: `03-Auth.md` for authentication & access strategy.
