# Collections Deep Dive

This document provides comprehensive documentation of all Payload CMS collections, their schemas, relationships, and usage patterns.

## Collection Architecture Overview

The application uses 8 main collections organized in three functional groups:

```
Authentication & Users:
├── Admins (admin panel access)
└── Users (app users: farmers + customers)

Content & Commerce:
├── Pages (marketing content)
├── Farms (farm profiles)
├── Products (product catalog)
├── Home (home page variants)
└── Media (file uploads)

Transactions:
└── Carts (customer shopping carts)
```

## Users Collection (`src/collections/Users.ts`)

### Schema Definition

```typescript
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    description: 'Usuarios de la aplicación (Farmers y Customers).',
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Farmer', value: 'farmer' },
        { label: 'Customer', value: 'customer' },
      ],
      required: true,
    },
    {
      name: 'name',
      type: 'text',
      required: false,
    },
    // email and password fields added automatically by auth: true
  ],
}
```

### User Roles Explained

**Farmer Role:**
- Can create and manage exactly ONE farm
- Can add/edit products in their farm inventory
- Cannot modify other farmers' data
- Cannot create carts (they manage inventory, not purchase)

**Customer Role:**
- Can create multiple shopping carts (one per farm)
- Cannot create or edit farms/products
- Can view all farms and products

### Access Control Implementation

```typescript
// Example access control for farms
access: {
  create: ({ req }) => {
    if (req.user?.collection !== 'users') return false
    if (req.user?.role !== 'farmer') return false
    return true
  },
  read: () => true, // Public
  update: ({ req, id }) => {
    if (req.user?.collection !== 'users') return false
    if (req.user?.role === 'farmer') {
      // Farmers can only edit their own farm
      return { owner: { equals: req.user.id } }
    }
    return false
  },
}
```

### Usage in Application

```typescript
// Server component authentication check
const { user } = await payload.auth({ headers: await headers() })
if (!user || user.collection !== 'users') {
  redirect('/login')
}

// Role-based rendering
if (user.role === 'farmer') {
  // Show farm management UI
} else if (user.role === 'customer') {
  // Show cart and purchase UI
}
```

## Farms Collection (`src/collections/Farms.ts`)

### Schema Structure

```typescript
export const Farms: CollectionConfig = {
  slug: 'farms',
  fields: [
    // Basic Information
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'richText' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    
    // Location Data
    {
      name: 'geo',
      type: 'group',
      fields: [
        { name: 'lat', type: 'number', required: true },
        { name: 'lng', type: 'number', required: true },
      ],
    },
    { name: 'location', type: 'text' }, // Human-readable address
    
    // Ownership
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    
    // Product Inventory
    {
      name: 'products',
      type: 'array',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        { name: 'quantity', type: 'number', required: true }, // bundle size
        {
          name: 'unit',
          type: 'select',
          options: ['kg', 'pcs', 'liters', 'boxes'],
          required: true,
        },
        { name: 'price', type: 'number', required: true }, // per bundle
        { name: 'stock', type: 'number', required: true }, // available bundles
      ],
    },
  ],
}
```

### Inventory System Deep Dive

Each farm maintains its own inventory entries for products. This design allows:

1. **Flexible Pricing**: Same product can have different prices at different farms
2. **Stock Management**: Each farm tracks its own stock levels
3. **Bundle Customization**: Different bundle sizes (5kg vs 10kg bags)

**Inventory Entry Example:**
```typescript
{
  product: "64f7c123...", // Reference to Products collection
  quantity: 5,            // 5 kg per bundle
  unit: "kg",            // Unit type
  price: 25.99,          // $25.99 per 5kg bundle
  stock: 10              // 10 bundles available (50kg total)
}
```

### Geographic Integration

The `geo` field enables map functionality:

```typescript
// Transform for map display
const farmLocations: FarmLocation[] = farms.map(farm => ({
  id: farm.id,
  slug: farm.slug,
  name: farm.name,
  lat: farm.geo.lat,
  lng: farm.geo.lng,
  locationText: farm.location,
}))
```

### Usage Patterns

**Farm Creation (Server Action):**
```typescript
export async function createFarm(data: FarmData) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  
  if (!user || user.role !== 'farmer') {
    throw new Error('Only farmers can create farms')
  }
  
  // Auto-assign ownership
  const farmData = { ...data, owner: user.id }
  return await payload.create({
    collection: 'farms',
    data: farmData,
  })
}
```

## Products Collection (`src/collections/Products.ts`)

### Base Product Schema

```typescript
export const Products: CollectionConfig = {
  slug: 'products',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'richText' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'category',
      type: 'select',
      options: [
        'vegetables',
        'fruits', 
        'dairy',
        'meat',
        'grains',
        'herbs',
        'other'
      ],
    },
  ],
}
```

### Product vs Inventory Relationship

**Important Design Decision:**
- `Products` collection stores base product information (name, description, category)
- `Farms` collection stores inventory data (price, stock, bundle size)
- This separation allows multiple farms to sell the same product with different pricing

**Example Scenario:**
```typescript
// Base Product
{
  id: "prod_123",
  name: "Organic Tomatoes",
  category: "vegetables",
  description: "Fresh organic tomatoes..."
}

// Farm A Inventory
{
  product: "prod_123",
  quantity: 2,     // 2kg bundles
  unit: "kg",
  price: 8.99,     // $8.99 per 2kg
  stock: 25        // 25 bundles available
}

// Farm B Inventory  
{
  product: "prod_123", 
  quantity: 5,     // 5kg bundles
  unit: "kg", 
  price: 20.00,    // $20.00 per 5kg
  stock: 10        // 10 bundles available
}
```

### Product Usage in Components

```typescript
// Display product with farm-specific pricing
{farm.products.map((inventory) => (
  <div key={inventory.product.id}>
    <h3>{inventory.product.name}</h3>
    <p>
      {inventory.quantity} {inventory.unit} - ${inventory.price}
    </p>
    <p>{inventory.stock} bundles available</p>
  </div>
))}
```

## Carts Collection (`src/collections/Carts.ts`)

### Cart Schema Design

```typescript
export const Carts: CollectionConfig = {
  slug: 'carts',
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'farm',
      type: 'relationship', 
      relationTo: 'farms',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: ['active', 'ordered', 'cancelled'],
      defaultValue: 'active',
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        { name: 'quantity', type: 'number', required: true }, // bundles
        { name: 'unit', type: 'text', required: true },      // snapshot
        { name: 'priceSnapshot', type: 'number', required: true }, // snapshot
      ],
    },
  ],
}
```

### Price Snapshot Strategy

**Why Snapshots?**
When a customer adds an item to their cart, the current price and unit are captured as a "snapshot". This ensures:

1. **Price Integrity**: Cart totals remain stable even if farm changes prices
2. **Fair Pricing**: Customers pay the price they saw when adding items
3. **Order History**: Past orders maintain accurate pricing records

**Implementation:**
```typescript
// Adding to cart (server action)
export async function addToCart({ farmId, productId, bundles = 1 }) {
  // 1. Find farm's current inventory for this product
  const farm = await payload.findByID({ collection: 'farms', id: farmId })
  const inventory = farm.products.find(p => p.product.id === productId)
  
  // 2. Snapshot current price/unit when adding
  const cartItem = {
    product: productId,
    quantity: bundles,
    unit: inventory.unit,           // Snapshot current unit
    priceSnapshot: inventory.price   // Snapshot current price
  }
  
  // 3. Add to cart with snapshot data
  await payload.create({
    collection: 'carts',
    data: { user: userId, farm: farmId, items: [cartItem] }
  })
}
```

### Cart-to-DTO Transformation

```typescript
// Transform cart document to client-friendly DTO
export function transformCartToDTO(cart: Cart, farm: Farm): CartDTO {
  return {
    id: cart.id,
    farmId: farm.id,
    farmName: farm.name,
    lines: cart.items.map(item => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      bundleSize: parseFloat(item.quantity),
      unit: item.unit,
      bundles: item.quantity,
      priceEach: item.priceSnapshot,    // Use snapshot, not current price
      subtotal: item.quantity * item.priceSnapshot,
    })),
    total: cart.items.reduce((sum, item) => 
      sum + (item.quantity * item.priceSnapshot), 0),
  }
}
```

## Pages Collection (`src/collections/Pages.ts`)

### Hierarchical Content Structure

```typescript
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'pages',
      admin: { description: 'Leave empty for top-level pages' },
    },
    {
      name: 'blocks',
      type: 'blocks',
      blocks: [HeroBlock, ContentBlock, FeatureBlock],
    },
  ],
}
```

### Nested Documents Plugin Integration

The `@payloadcms/plugin-nested-docs` automatically generates:

1. **Breadcrumb Navigation**: Parent → Child → Grandchild
2. **URL Structure**: `/parent/child/grandchild`
3. **Admin UI**: Tree view for content organization

**URL Generation Example:**
```typescript
// Plugin configuration in payload.config.ts
nestedDocsPlugin({
  collections: ['pages'],
  generateLabel: (_, doc) => doc?.name as string,
  generateURL: (docs) =>
    docs.reduce((url, doc) => `${url}/${doc.slug}`.replace(/^\/+/, '/'), ''),
})

// Results in URLs like:
// /about
// /about/team  
// /about/team/leadership
```

## Media Collection (`src/collections/Media.ts`)

### S3 Storage Integration

```typescript
export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticURL: '/media',
    staticDir: 'media',
    mimeTypes: ['image/*', 'video/*', 'application/pdf'],
  },
  fields: [
    { name: 'alt', type: 'text' },
    { name: 'caption', type: 'text' },
  ],
}
```

### Storage Flow

1. **Upload**: File uploaded via admin panel or API
2. **S3 Processing**: File stored in S3 bucket with generated filename
3. **Database Record**: Media document created with S3 URL reference
4. **Usage**: Other collections reference media via relationship field

```typescript
// Usage in components
<Image
  src={farm.image.url}
  alt={farm.image.alt || farm.name}
  width={400}
  height={300}
/>
```

## Collection Interconnections

### Data Relationship Map

```
Users (farmers/customers)
  ↓ (owns)
Farms
  ↓ (stocks)
Products → (referenced in) → Farm.products[] (inventory)
  ↓ (selected for)
Carts → (belongs to) → Users (customers only)
  ↓ (items reference)
Products (with price snapshots)

Pages → (may reference) → Media
Farms → (may reference) → Media  
Products → (may reference) → Media
```

### Query Patterns

**Common Queries:**

```typescript
// Get farm with populated products and owner
const farm = await payload.findByID({
  collection: 'farms',
  id: farmId,
  depth: 2, // Populates relationships 2 levels deep
})

// Get user's carts with populated items
const carts = await payload.find({
  collection: 'carts',
  where: {
    user: { equals: userId },
    status: { equals: 'active' },
  },
  depth: 3, // User → Cart → Items → Products
})

// Get farms within geographic bounds
const nearbyFarms = await payload.find({
  collection: 'farms',
  where: {
    'geo.lat': { greater_than: 40.0, less_than: 41.0 },
    'geo.lng': { greater_than: -74.0, less_than: -73.0 },
  },
})
```

---
Next: `11-Server-Actions-Deep-Dive.md` for detailed server action implementations and patterns.