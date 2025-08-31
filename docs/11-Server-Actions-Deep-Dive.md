# Server Actions Deep Dive

This document provides comprehensive coverage of all server actions, their implementation patterns, security considerations, and usage across the application.

## Server Actions Architecture

### Why Server Actions?

Server actions provide several key advantages in this application:

1. **Security**: Business logic runs on server, preventing client-side manipulation
2. **Performance**: No need to expose database credentials or complex queries to client
3. **Type Safety**: Full TypeScript support with proper error handling
4. **Simplicity**: Direct function calls from client components, no REST API needed

### File Organization

```
src/app/(frontend)/
├── login/actions/
│   ├── login.ts          # Authentication
│   ├── logout.ts         # Session termination
│   └── register.ts       # User registration
├── cart/actions/
│   └── cartActions.ts    # Cart management
├── farms/actions/
│   └── farmActions.ts    # Farm CRUD operations
└── [other]/actions/
    └── [feature]Actions.ts
```

## Authentication Actions

### Login Action (`login/actions/login.ts`)

```typescript
'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login({ email, password }: { 
  email: string
  password: string 
}) {
  const payload = await getPayload({ config })
  
  try {
    // Payload handles password verification and session creation
    const res = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    
    if (res.token) {
      // Set HTTP-only cookie for session management
      const cookieStore = await cookies()
      cookieStore.set('payload-token', res.token, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      
      return { success: true, user: res.user }
    }
    
    return { success: false, error: 'Login failed' }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Authentication failed' 
    }
  }
}
```

**Security Features:**
- Password verification handled by Payload (hashed storage)
- HTTP-only cookies prevent XSS attacks
- Secure flag enabled in production
- SameSite protection against CSRF

**Usage Pattern:**
```typescript
// In client component
import { login } from '@/app/(frontend)/login/actions/login'

const handleSubmit = async (formData: FormData) => {
  const result = await login({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  
  if (result.success) {
    queryClient.invalidateQueries({ queryKey: ['user'] })
    router.push('/dashboard')
  } else {
    setError(result.error)
  }
}
```

### Registration Action (`login/actions/register.ts`)

```typescript
'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

export async function register(data: {
  name: string
  email: string
  password: string
  role: 'farmer' | 'customer'
}) {
  const payload = await getPayload({ config })
  
  try {
    // Check if user already exists
    const existingUser = await payload.find({
      collection: 'users',
      where: { email: { equals: data.email } },
      limit: 1,
    })
    
    if (existingUser.docs.length > 0) {
      return { 
        success: false, 
        error: 'Email already registered' 
      }
    }
    
    // Create new user
    const newUser = await payload.create({
      collection: 'users',
      data,
    })
    
    // Automatically log in the new user
    return await login({ 
      email: data.email, 
      password: data.password 
    })
    
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Registration failed' 
    }
  }
}
```

**Business Logic:**
1. **Duplicate Check**: Prevents multiple accounts with same email
2. **Auto-login**: New users are immediately logged in
3. **Role Assignment**: Users specify their role during registration

### Logout Action (`login/actions/logout.ts`)

```typescript
'use server'

import { cookies } from 'next/headers'

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('payload-token')
  
  return { success: true }
}
```

**Simplicity by Design**: Logout only needs to clear the session cookie.

## Cart Management Actions

### Cart Actions (`cart/actions/cartActions.ts`)

#### Add to Cart Action

```typescript
'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'

export async function addToCart({
  farmId,
  productId,
  bundles = 1,
}: {
  farmId: string
  productId: string
  bundles?: number
}) {
  const payload = await getPayload({ config })
  
  // 1. Authenticate user
  const { user } = await payload.auth({ 
    headers: await headers() 
  })
  
  if (!user || user.collection !== 'users' || user.role !== 'customer') {
    throw new Error('Only customers can add items to cart')
  }
  
  // 2. Validate positive quantity
  if (bundles <= 0) {
    throw new Error('Quantity must be positive')
  }
  
  // 3. Find farm and verify product exists in inventory
  const farm = await payload.findByID({
    collection: 'farms',
    id: farmId,
    depth: 1,
  })
  
  const inventoryItem = farm.products.find(
    (p: any) => p.product.id === productId
  )
  
  if (!inventoryItem) {
    throw new Error('Product not available at this farm')
  }
  
  // 4. Check stock availability
  if (bundles > inventoryItem.stock) {
    throw new Error(
      `Only ${inventoryItem.stock} bundles available`
    )
  }
  
  // 5. Find or create cart for this user-farm combination
  const existingCarts = await payload.find({
    collection: 'carts',
    where: {
      and: [
        { user: { equals: user.id } },
        { farm: { equals: farmId } },
        { status: { equals: 'active' } },
      ],
    },
    limit: 1,
  })
  
  let cart = existingCarts.docs[0]
  
  if (cart) {
    // 6. Update existing cart
    const existingItemIndex = cart.items.findIndex(
      (item: any) => item.product.id === productId
    )
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const newQuantity = cart.items[existingItemIndex].quantity + bundles
      
      if (newQuantity > inventoryItem.stock) {
        throw new Error('Not enough stock available')
      }
      
      cart.items[existingItemIndex].quantity = newQuantity
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity: bundles,
        unit: inventoryItem.unit,
        priceSnapshot: inventoryItem.price,
      })
    }
    
    await payload.update({
      collection: 'carts',
      id: cart.id,
      data: { items: cart.items },
    })
  } else {
    // 7. Create new cart
    await payload.create({
      collection: 'carts',
      data: {
        user: user.id,
        farm: farmId,
        status: 'active',
        items: [
          {
            product: productId,
            quantity: bundles,
            unit: inventoryItem.unit,
            priceSnapshot: inventoryItem.price,
          },
        ],
      },
    })
  }
  
  return { success: true }
}
```

**Key Features:**
- **Stock Validation**: Prevents overselling
- **Price Snapshot**: Captures current price for consistency
- **Cart Consolidation**: One cart per farm per customer
- **Atomic Operations**: Database consistency maintained

#### Decrement Cart Item Action

```typescript
export async function decrementCartItem({
  cartId,
  productId,
  amount = 1,
}: {
  cartId: string
  productId: string
  amount?: number
}) {
  const payload = await getPayload({ config })
  
  // 1. Authentication
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || user.collection !== 'users') {
    throw new Error('Authentication required')
  }
  
  // 2. Find cart and verify ownership
  const cart = await payload.findByID({
    collection: 'carts',
    id: cartId,
    depth: 1,
  })
  
  if (cart.user.id !== user.id) {
    throw new Error('Access denied')
  }
  
  // 3. Find item in cart
  const itemIndex = cart.items.findIndex(
    (item: any) => item.product.id === productId
  )
  
  if (itemIndex === -1) {
    throw new Error('Item not found in cart')
  }
  
  // 4. Update or remove item
  const currentQuantity = cart.items[itemIndex].quantity
  const newQuantity = currentQuantity - amount
  
  if (newQuantity <= 0) {
    // Remove item from cart
    cart.items.splice(itemIndex, 1)
  } else {
    // Update quantity
    cart.items[itemIndex].quantity = newQuantity
  }
  
  // 5. Update or delete cart
  if (cart.items.length === 0) {
    // Delete empty cart
    await payload.delete({
      collection: 'carts',
      id: cartId,
    })
    return { success: true, cartDeleted: true }
  } else {
    // Update cart with new items
    await payload.update({
      collection: 'carts',
      id: cartId,
      data: { items: cart.items },
    })
    return { success: true, cartDeleted: false }
  }
}
```

**Smart Cleanup**: Empty carts are automatically deleted to keep database clean.

#### Clear All Carts Action

```typescript
export async function clearAllCarts() {
  const payload = await getPayload({ config })
  
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || user.collection !== 'users') {
    throw new Error('Authentication required')
  }
  
  // Delete all active carts for this user
  await payload.delete({
    collection: 'carts',
    where: {
      and: [
        { user: { equals: user.id } },
        { status: { equals: 'active' } },
      ],
    },
  })
  
  return { success: true }
}
```

#### Get Cart Actions

```typescript
export async function getCart(farmId: string) {
  const payload = await getPayload({ config })
  
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return null
  
  const carts = await payload.find({
    collection: 'carts',
    where: {
      and: [
        { user: { equals: user.id } },
        { farm: { equals: farmId } },
        { status: { equals: 'active' } },
      ],
    },
    limit: 1,
    depth: 2,
  })
  
  const cart = carts.docs[0]
  if (!cart) return null
  
  // Transform to DTO for client consumption
  return await transformCartToDTO(cart)
}

export async function getAllCarts() {
  const payload = await getPayload({ config })
  
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { carts: [] }
  
  const carts = await payload.find({
    collection: 'carts',
    where: {
      and: [
        { user: { equals: user.id } },
        { status: { equals: 'active' } },
      ],
    },
    depth: 2,
  })
  
  // Transform all carts to DTOs
  const cartDTOs = await Promise.all(
    carts.docs.map(cart => transformCartToDTO(cart))
  )
  
  return { carts: cartDTOs }
}
```

## Farm Management Actions

### Farm Actions (`farms/actions/farmActions.ts`)

#### Create Farm Action

```typescript
'use server'

export async function createFarm(formData: FormData) {
  const payload = await getPayload({ config })
  
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || user.collection !== 'users' || user.role !== 'farmer') {
    throw new Error('Only farmers can create farms')
  }
  
  // Check if farmer already has a farm
  const existingFarms = await payload.find({
    collection: 'farms',
    where: { owner: { equals: user.id } },
    limit: 1,
  })
  
  if (existingFarms.docs.length > 0) {
    throw new Error('Farmers can only create one farm')
  }
  
  // Extract form data
  const farmData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    location: formData.get('location') as string,
    geo: {
      lat: parseFloat(formData.get('lat') as string),
      lng: parseFloat(formData.get('lng') as string),
    },
    owner: user.id, // Auto-assign ownership
    products: [], // Start with empty inventory
  }
  
  // Validate required fields
  if (!farmData.name || !farmData.location) {
    throw new Error('Name and location are required')
  }
  
  if (!farmData.geo.lat || !farmData.geo.lng) {
    throw new Error('Valid coordinates are required')
  }
  
  const farm = await payload.create({
    collection: 'farms',
    data: farmData,
  })
  
  return { success: true, farm }
}
```

**Business Rules Enforced:**
- One farm per farmer maximum
- Auto-ownership assignment
- Required field validation
- Geographic coordinate validation

#### Add Product to Farm Inventory

```typescript
export async function addProductToFarm({
  farmId,
  productId,
  quantity,
  unit,
  price,
  stock,
}: {
  farmId: string
  productId: string
  quantity: number
  unit: string
  price: number
  stock: number
}) {
  const payload = await getPayload({ config })
  
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || user.collection !== 'users') {
    throw new Error('Authentication required')
  }
  
  // Get farm and verify ownership
  const farm = await payload.findByID({
    collection: 'farms',
    id: farmId,
  })
  
  if (farm.owner.id !== user.id) {
    throw new Error('You can only modify your own farm')
  }
  
  // Check if product already exists in inventory
  const existingProductIndex = farm.products.findIndex(
    (p: any) => p.product.id === productId
  )
  
  if (existingProductIndex >= 0) {
    throw new Error('Product already exists in farm inventory')
  }
  
  // Validate input
  if (quantity <= 0 || price <= 0 || stock < 0) {
    throw new Error('Invalid quantity, price, or stock values')
  }
  
  // Add product to farm inventory
  const newInventoryItem = {
    product: productId,
    quantity,
    unit,
    price,
    stock,
  }
  
  await payload.update({
    collection: 'farms',
    id: farmId,
    data: {
      products: [...farm.products, newInventoryItem],
    },
  })
  
  return { success: true }
}
```

## Error Handling Patterns

### Consistent Error Structure

All server actions follow a consistent error handling pattern:

```typescript
try {
  // Business logic here
  return { success: true, data: result }
} catch (error: any) {
  return { 
    success: false, 
    error: error.message || 'Operation failed' 
  }
}
```

### Client-Side Error Display

```typescript
// In client components
const { mutate: addToCart, isPending, error } = useMutation({
  mutationFn: addToCart,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['carts'] })
    toast.success('Added to cart!')
  },
  onError: (error: any) => {
    toast.error(error.message || 'Failed to add to cart')
  },
})
```

## Security Considerations

### Authentication Verification

Every action starts with authentication:

```typescript
const { user } = await payload.auth({ headers: await headers() })
if (!user || user.collection !== 'users') {
  throw new Error('Authentication required')
}
```

### Authorization Checks

Role-based and ownership checks:

```typescript
// Role check
if (user.role !== 'farmer') {
  throw new Error('Only farmers can create farms')
}

// Ownership check
if (farm.owner.id !== user.id) {
  throw new Error('Access denied')
}
```

### Input Validation

All inputs are validated:

```typescript
// Type validation
if (typeof quantity !== 'number' || quantity <= 0) {
  throw new Error('Invalid quantity')
}

// Business rule validation
if (bundles > inventoryItem.stock) {
  throw new Error('Not enough stock available')
}
```

## Performance Optimization

### Selective Depth Loading

```typescript
// Only load what's needed
const farm = await payload.findByID({
  collection: 'farms',
  id: farmId,
  depth: 1, // Only populate first level relationships
})
```

### Efficient Queries

```typescript
// Use specific where conditions to limit results
const carts = await payload.find({
  collection: 'carts',
  where: {
    and: [
      { user: { equals: user.id } },
      { status: { equals: 'active' } },
    ],
  },
  limit: 10, // Prevent large result sets
})
```

---
Next: `12-Client-Components-Integration.md` for detailed client-side integration patterns.