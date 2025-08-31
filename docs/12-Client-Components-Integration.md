# Client Components & React Query Integration

This document covers client-side patterns, React Query integration, state management, and UI component architecture.

## Client-Side Architecture Overview

### Server vs Client Component Boundaries

The application follows a strict server-first approach:

```
Server Components (Data Fetching)
    ↓ (props)
Client Components (Interactivity)
    ↓ (React Query)
API Routes (Dynamic Data)
    ↓ (Server Actions)
Payload CMS (Database)
```

**Design Principles:**
- Server components handle all initial data fetching
- Client components only handle user interactions
- React Query manages client-side cache and mutations
- Server actions handle all business logic and mutations

## Authentication Hook (`useAuth.ts`)

### Implementation

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import type { User } from '@/payload-types'

export const useAuth = () => {
  const { data, isLoading, isError } = useQuery<(User & { collection: string }) | null>({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me')
      if (!response.ok) {
        // 401 Unauthorized means user is not logged in
        return null
      }
      const { user } = await response.json()
      return user
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true,
  })

  return { user: data, isLoading, isError }
}
```

### Key Features

**Cache Strategy:**
- **30-minute stale time**: Reduces unnecessary API calls
- **Window focus refetch**: Ensures fresh data when user returns
- **Automatic retries**: Built-in React Query retry logic

**Security Considerations:**
- No token storage in localStorage (HTTP-only cookies)
- Graceful handling of unauthenticated state
- Type-safe user object with collection information

### Usage Patterns

#### Basic Authentication Check
```typescript
'use client'

import { useAuth } from '@/app/(frontend)/hooks/useAuth'

export function AuthenticatedComponent() {
  const { user, isLoading } = useAuth()
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  if (!user) {
    return <div>Please log in to continue</div>
  }
  
  return <div>Welcome, {user.name || user.email}!</div>
}
```

#### Role-Based Rendering
```typescript
export function RoleBasedNav() {
  const { user } = useAuth()
  
  return (
    <nav>
      <Link href="/farms">Browse Farms</Link>
      
      {user?.role === 'farmer' && (
        <Link href="/dashboard">Manage My Farm</Link>
      )}
      
      {user?.role === 'customer' && (
        <Link href="/cart">My Cart</Link>
      )}
      
      {!user && (
        <Link href="/login">Login</Link>
      )}
    </nav>
  )
}
```

#### Authentication with Server Actions
```typescript
export function LoginForm() {
  const { mutate: loginUser, isPending } = useMutation({
    mutationFn: login,
    onSuccess: () => {
      // Invalidate auth cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['user'] })
      router.push('/dashboard')
    },
    onError: (error: any) => {
      toast.error(error.message)
    },
  })
  
  const handleSubmit = (formData: FormData) => {
    loginUser({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })
  }
  
  return (
    <form action={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button disabled={isPending}>
        {isPending ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```

## Cart Management Hooks (`useCarts.ts`)

### Core Cart Hooks

#### Fetch All Carts Hook
```typescript
export function useAllCarts() {
  const query = useQuery<{ carts: CartDTO[] }>({
    queryKey: ['carts'],
    queryFn: async () => {
      const res = await fetch('/cart/api', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch carts')
      return res.json()
    },
    select: (data) => ({ carts: data.carts || [] }),
    staleTime: 15 * 1000, // 15 seconds - cart data changes frequently
  })
  
  return { ...query, carts: query.data?.carts || [] }
}
```

**Cache Strategy:**
- **Short stale time (15s)**: Cart data changes frequently
- **No-store cache**: Prevent browser caching
- **Safe defaults**: Returns empty array if no data

#### Cart Totals Calculation
```typescript
export function useCartTotals() {
  const { carts } = useAllCarts()
  
  // Derived state calculation
  let total = 0
  let lineGroups = 0
  let itemCount = 0
  
  carts.forEach((cart) => {
    total += cart.total
    lineGroups += cart.lines.length
    cart.lines.forEach((line) => {
      itemCount += line.bundles
    })
  })
  
  return { total, lines: lineGroups, itemCount }
}
```

**Performance Benefits:**
- Calculated from cached cart data
- No additional API calls
- Automatically updates when cart data changes

### Cart Mutation Hooks

#### Add to Cart Hook
```typescript
export function useAddToCart() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationKey: ['addToCart'],
    mutationFn: async ({ farmId, productId, bundles = 1 }: AddArgs) => {
      const res = await fetch('/cart/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, productId, bundles }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Add failed')
      return data.cart as CartDTO
    },
    onSuccess: () => {
      // Invalidate cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['carts'] })
    },
  })
}
```

#### Usage in Product Components
```typescript
export function ProductCard({ product, farm }: ProductCardProps) {
  const { mutate: addToCart, isPending } = useAddToCart()
  const { user } = useAuth()
  
  const handleAddToCart = () => {
    if (!user || user.role !== 'customer') {
      toast.error('Please login as a customer to add items to cart')
      return
    }
    
    addToCart(
      { farmId: farm.id, productId: product.id },
      {
        onSuccess: () => {
          toast.success(`Added ${product.name} to cart!`)
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to add to cart')
        },
      }
    )
  }
  
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price} per {product.unit}</p>
      <button 
        onClick={handleAddToCart}
        disabled={isPending || product.stock <= 0}
      >
        {isPending ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  )
}
```

### Cart Sidebar Integration

```typescript
export function CartSidebar() {
  const { carts } = useAllCarts()
  const { total, itemCount } = useCartTotals()
  const { mutate: decrementItem } = useDecrementItem()
  const { mutate: clearAll } = useClearCarts()
  
  if (carts.length === 0) {
    return (
      <div className="cart-sidebar">
        <h3>Your Cart</h3>
        <p>Your cart is empty</p>
      </div>
    )
  }
  
  return (
    <div className="cart-sidebar">
      <div className="cart-header">
        <h3>Your Cart ({itemCount} items)</h3>
        <button onClick={() => clearAll()}>Clear All</button>
      </div>
      
      {carts.map((cart) => (
        <div key={cart.id} className="cart-farm-section">
          <h4>{cart.farmName}</h4>
          
          {cart.lines.map((line) => (
            <div key={line.id} className="cart-line">
              <span>{line.productName}</span>
              <span>{line.bundles} × ${line.priceEach}</span>
              <span>${line.subtotal.toFixed(2)}</span>
              
              <button
                onClick={() => decrementItem({
                  cartId: cart.id,
                  productId: line.productId,
                })}
              >
                Remove One
              </button>
            </div>
          ))}
          
          <div className="cart-total">
            Farm Total: ${cart.total.toFixed(2)}
          </div>
        </div>
      ))}
      
      <div className="grand-total">
        Grand Total: ${total.toFixed(2)}
      </div>
    </div>
  )
}
```

## React Query Global Configuration

### Provider Setup (`providers.tsx`)

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          // Global defaults
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
          retry: 3,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          refetchOnWindowFocus: false, // Disabled globally, enabled per query
        },
        mutations: {
          retry: 1,
          gcTime: 5 * 60 * 1000,
        },
      },
    })
  )
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
```

### Query Key Patterns

```typescript
// Consistent query key structure
export const queryKeys = {
  // Authentication
  user: ['user'] as const,
  
  // Carts
  carts: ['carts'] as const,
  cart: (farmId: string) => ['carts', farmId] as const,
  
  // Farms
  farms: ['farms'] as const,
  farm: (slug: string) => ['farms', slug] as const,
  farmProducts: (farmId: string) => ['farms', farmId, 'products'] as const,
  
  // Products
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
}
```

## State Management Patterns

### Local UI State

For simple UI state, use React's built-in hooks:

```typescript
export function FarmForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setErrors({})
    
    try {
      await createFarm(formData)
      router.push('/dashboard')
    } catch (error: any) {
      setErrors({ general: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form action={handleSubmit}>
      {errors.general && (
        <div className="error">{errors.general}</div>
      )}
      {/* form fields */}
    </form>
  )
}
```

### Global UI State (Context)

For cross-component UI state like modals or sidebar visibility:

```typescript
// CartUIContext.tsx
export const CartUIContext = createContext<{
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}>({
  isOpen: false,
  toggle: () => {},
  open: () => {},
  close: () => {},
})

export function CartUIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const value = {
    isOpen,
    toggle: () => setIsOpen(prev => !prev),
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
  
  return (
    <CartUIContext.Provider value={value}>
      {children}
    </CartUIContext.Provider>
  )
}

export const useCartUI = () => useContext(CartUIContext)
```

## Error Boundary Patterns

### Query Error Handling

```typescript
export function DataWrapper({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div className="error-boundary">
              <h2>Something went wrong</h2>
              <p>{error.message}</p>
              <button onClick={resetErrorBoundary}>
                Try again
              </button>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

## Performance Optimization

### Selective Re-renders

```typescript
// Only re-render when specific cart data changes
export function CartItemCount() {
  const { itemCount } = useCartTotals()
  return <span>{itemCount}</span>
}

// Memoize expensive calculations
export const ExpensiveComponent = memo(({ data }: { data: ComplexData }) => {
  const processedData = useMemo(() => {
    return data.items.map(processComplexItem)
  }, [data.items])
  
  return <div>{/* render */}</div>
})
```

### Optimistic Updates (Future Enhancement)

```typescript
// Example of optimistic cart updates
export function useOptimisticAddToCart() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: addToCart,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['carts'] })
      
      // Snapshot the previous value
      const previousCarts = queryClient.getQueryData(['carts'])
      
      // Optimistically update
      queryClient.setQueryData(['carts'], (old: any) => {
        // Add optimistic item
        return updateCartsOptimistically(old, variables)
      })
      
      return { previousCarts }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCarts) {
        queryClient.setQueryData(['carts'], context.previousCarts)
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['carts'] })
    },
  })
}
```

---
Next: `13-Mapbox-Integration.md` for detailed mapping components and geographic features.