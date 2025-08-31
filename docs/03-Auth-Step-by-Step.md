# Guía Completa: Construcción del Sistema de Autenticación 🔐

## Tabla de Contenido
1. [Arquitectura del Sistema de Auth](#arquitectura-del-sistema-de-auth)
2. [Paso 1: Configuración de Colecciones Auth en Payload](#paso-1-configuración-de-colecciones-auth-en-payload)
3. [Paso 2: Implementación de Server Actions](#paso-2-implementación-de-server-actions)
4. [Paso 3: Hook de Autenticación en Frontend](#paso-3-hook-de-autenticación-en-frontend)
5. [Paso 4: Componentes de Login/Logout](#paso-4-componentes-de-loginlogout)
6. [Paso 5: Protección de Rutas](#paso-5-protección-de-rutas)
7. [Paso 6: Control de Acceso por Roles](#paso-6-control-de-acceso-por-roles)
8. [Ejemplos Prácticos de Implementación](#ejemplos-prácticos-de-implementación)
9. [Patrones de Seguridad](#patrones-de-seguridad)

---

## Arquitectura del Sistema de Auth

### Flujo Completo de Autenticación

```mermaid
graph TD
    A[Usuario Ingresa Credenciales] --> B[Login Server Action]
    B --> C[Payload.login()]
    C --> D[Verificación en Base de Datos]
    D --> E[Generar JWT Token]
    E --> F[Set HTTP-Only Cookie]
    F --> G[Respuesta al Cliente]
    G --> H[Invalidar React Query Cache]
    H --> I[Redirección a Dashboard]
```

### Componentes del Sistema

1. **Colecciones de Auth**: `users` y `admins`
2. **Server Actions**: `login`, `logout`, `register`
3. **Frontend Hook**: `useAuth` con React Query
4. **Control de Acceso**: Funciones por colección
5. **Protección de Rutas**: Middleware de verificación

---

## Paso 1: Configuración de Colecciones Auth en Payload

### 1.1 Colección de Usuarios (Frontend)

**Archivo**: `src/collections/Users.ts`

```typescript
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true, // ← Habilita autenticación automática
  admin: {
    useAsTitle: 'email',
    description: 'Usuarios de la aplicación (Farmers y Customers).',
  },
  fields: [
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        {
          label: 'Farmer',
          value: 'farmer',
        },
        {
          label: 'Customer', 
          value: 'customer',
        },
      ],
      required: true,
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    // Email y password son añadidos automáticamente por auth: true
  ],
}
```

**¿Por qué esta estructura?**
- `auth: true` añade automáticamente campos de email, password y funcionalidad de login
- `role` permite diferenciar entre farmers y customers
- `useAsTitle: 'email'` mejora la experiencia del admin panel

### 1.2 Colección de Administradores (Backend)

**Archivo**: `src/collections/Admins.ts`

```typescript
import type { CollectionConfig } from 'payload'

export const Admins: CollectionConfig = {
  slug: 'admins',
  auth: true,
  admin: {
    useAsTitle: 'email',
    description: 'Usuarios con acceso al panel de administración.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    // Email y password añadidos automáticamente
  ],
}
```

**¿Por qué separar users y admins?**
- **Seguridad**: Los admins no aparecen como "usuarios logueados" en el frontend
- **Escalabilidad**: Diferentes permisos y flujos para cada tipo
- **Mantenimiento**: Lógica de negocio separada

### 1.3 Registro en Configuración Principal

**Archivo**: `src/payload.config.ts`

```typescript
import { Users } from './collections/Users'
import { Admins } from './collections/Admins'

export default buildConfig({
  collections: [
    Users,    // ← Usuarios de la aplicación
    Admins,   // ← Administradores del panel
    // ... otras colecciones
  ],
  // ... resto de configuración
})
```

---

## Paso 2: Implementación de Server Actions

### 2.1 Server Action de Login

**Archivo**: `src/app/(frontend)/login/actions/login.ts`

```typescript
'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { User } from '@/payload-types'

// Interfaces para tipado fuerte
interface LoginParams {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  error?: string
}

export type Result = {
  exp?: number
  token?: string
  user?: User
}

export async function login({ email, password }: LoginParams): Promise<LoginResponse> {
  // 1. Obtener instancia de Payload
  const payload = await getPayload({ config })
  
  try {
    // 2. Intentar login con Payload
    const result = await payload.login({
      collection: 'users', // ← Especificar colección
      data: { email, password },
    })

    // 3. Si el login es exitoso, establecer cookie
    if (result.token) {
      const cookieStore = await cookies()
      cookieStore.set('payload-token', result.token, {
        httpOnly: true,  // ← Crítico para seguridad
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        // maxAge: 7 * 24 * 60 * 60, // 7 días (opcional)
      })

      return { success: true }
    } else {
      return { success: false, error: 'Login failed' }
    }
  } catch (error) {
    console.error('Login error: ', error)
    return { 
      success: false, 
      error: 'An unexpected login error occurred' 
    }
  }
}
```

**¿Por qué esta implementación?**
- **`'use server'`**: Garantiza ejecución en el servidor
- **HTTP-Only Cookie**: Previene ataques XSS
- **Tipado fuerte**: Interfaces claras para entrada y salida
- **Manejo de errores**: Respuestas consistentes

### 2.2 Server Action de Logout

**Archivo**: `src/app/(frontend)/login/actions/logout.ts`

```typescript
'use server'

import { cookies } from 'next/headers'

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('payload-token')
}
```

**¿Por qué tan simple?**
- El logout solo necesita eliminar la cookie
- Payload maneja automáticamente la invalidación del token
- Simple = menos puntos de fallo

### 2.3 Server Action de Registro (Opcional)

**Archivo**: `src/app/(frontend)/login/actions/register.ts`

```typescript
'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

interface RegisterParams {
  email: string
  password: string
  name: string
  role: 'farmer' | 'customer'
}

export async function register(params: RegisterParams) {
  const payload = await getPayload({ config })
  
  try {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: params.email,
        password: params.password,
        name: params.name,
        role: params.role,
      },
    })
    
    return { success: true, user }
  } catch (error) {
    return { 
      success: false, 
      error: 'Registration failed' 
    }
  }
}
```

---

## Paso 3: Hook de Autenticación en Frontend

### 3.1 Hook useAuth con React Query

**Archivo**: `src/app/(frontend)/hooks/useAuth.ts`

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import type { User } from '@/payload-types'

export const useAuth = () => {
  const { data, isLoading, isError } = useQuery<(User & { collection: string }) | null>({
    queryKey: ['user'], // ← Clave de cache
    queryFn: async () => {
      const response = await fetch('/api/users/me')
      if (!response.ok) {
        // Si no está autenticado (401), retorna null
        return null
      }
      const { user } = await response.json()
      return user
    },
    staleTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: true, // Re-verificar al cambiar de pestaña
  })

  return { user: data, isLoading, isError }
}
```

**¿Por qué React Query?**
- **Cache inteligente**: Evita requests innecesarios
- **Invalidación automática**: Actualiza cuando es necesario
- **Estados de carga**: `isLoading`, `isError` para UI reactiva
- **Optimización**: `staleTime` y `refetchOnWindowFocus`

### 3.2 API Route para verificar usuario actual

**Archivo**: `src/app/(frontend)/api/users/me/route.ts`

```typescript
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const payload = await getPayload({ config })
  
  try {
    // Leer headers para obtener la cookie de sesión
    const headersList = await headers()
    const { user } = await payload.auth({ headers: headersList })
    
    if (!user || user.collection !== 'users') {
      // No autenticado o es admin (no usuario de app)
      return NextResponse.json({ user: null }, { status: 401 })
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
```

---

## Paso 4: Componentes de Login/Logout

### 4.1 Componente de Login

**Archivo**: `src/app/(frontend)/login/components/LoginForm.tsx`

```tsx
'use client'

import React, { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { login, LoginResponse } from '../actions/login'
import { Form } from '@heroui/form'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'

export default function LoginForm() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setError(null)

    // 1. Extraer datos del formulario
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // 2. Llamar server action
    const result: LoginResponse = await login({ email, password })
    setIsPending(false)

    if (result.success) {
      // 3. Invalidar cache de React Query
      queryClient.invalidateQueries({ queryKey: ['user'] })
      
      // 4. Redireccionar
      router.push('/dashboard')
      router.refresh() // Forzar recarga del server component
    } else {
      setError(result.error || 'Login failed, an error occurred')
    }
  }

  return (
    <Form
      className="w-2xs p-8 max-w-xs flex flex-col gap-4 bg-[var(--carrot)]/90 rounded-2xl"
      onSubmit={handleSubmit}
    >
      <Input
        isRequired
        errorMessage="Please enter a valid email"
        label="Email"
        labelPlacement="outside"
        name="email"
        placeholder="Enter your email"
        type="email"
      />

      <Input
        isRequired
        errorMessage="Please enter a valid password"
        label="Password"
        labelPlacement="outside"
        name="password"
        placeholder="Enter your password"
        type="password"
      />

      <div className="flex gap-2">
        <Button color="primary" type="submit" disabled={isPending}>
          {isPending ? 'Logging in...' : 'Login'}
        </Button>
        <Button type="reset" variant="flat">
          Reset
        </Button>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}
    </Form>
  )
}
```

**Flujo del componente:**
1. **Formulario controlado**: Manejo de estado local para UI
2. **Server Action**: Llamada directa desde el cliente
3. **Cache invalidation**: Actualiza estado global
4. **Navegación**: Redirección post-login

### 4.2 Componente de Logout

**Archivo**: `src/app/(frontend)/components/LogoutButton.tsx`

```tsx
'use client'

import { logout } from '@/app/(frontend)/login/actions/logout'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@heroui/button'

export default function LogoutButton() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    
    // Limpiar cache de usuario
    queryClient.setQueryData(['user'], null)
    
    // Redireccionar a home
    router.push('/')
    router.refresh()
  }

  return (
    <Button onClick={handleLogout} variant="ghost">
      Logout
    </Button>
  )
}
```

---

## Paso 5: Protección de Rutas

### 5.1 Protección en Server Components

**Archivo**: `src/app/(frontend)/dashboard/page.tsx`

```tsx
import { getPayload } from 'payload'
import config from '@/payload.config'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function DashboardPage() {
  // 1. Obtener Payload
  const payload = await getPayload({ config })
  
  // 2. Verificar autenticación
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })
  
  // 3. Proteger ruta
  if (!user || user.collection !== 'users') {
    redirect('/login')
  }
  
  // 4. Renderizar contenido protegido
  return (
    <div>
      <h1>Dashboard para {user.email}</h1>
      <p>Rol: {user.role}</p>
      {/* Contenido específico por rol */}
    </div>
  )
}
```

### 5.2 Protección en Client Components

**Archivo**: `src/app/(frontend)/components/ProtectedWrapper.tsx`

```tsx
'use client'

import { useAuth } from '@/app/(frontend)/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedWrapperProps {
  children: React.ReactNode
  requiredRole?: 'farmer' | 'customer'
  fallback?: React.ReactNode
}

export default function ProtectedWrapper({ 
  children, 
  requiredRole,
  fallback 
}: ProtectedWrapperProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Estado de carga
  if (isLoading) {
    return <div>Loading...</div>
  }

  // No autenticado
  if (!user) {
    return fallback || <div>Redirecting to login...</div>
  }

  // Verificar rol requerido
  if (requiredRole && user.role !== requiredRole) {
    return <div>Access denied. Required role: {requiredRole}</div>
  }

  return <>{children}</>
}
```

**Uso del wrapper:**
```tsx
<ProtectedWrapper requiredRole="farmer">
  <FarmerDashboard />
</ProtectedWrapper>
```

---

## Paso 6: Control de Acceso por Roles

### 6.1 Funciones de Control de Acceso

**Archivo**: `src/access/isAuthenticatedUser.ts`

```typescript
import type { Access } from 'payload'

// Función base: usuario autenticado de la app
export const isAuthenticatedUser: Access = ({ req: { user } }) => {
  return Boolean(user && user.collection === 'users')
}

// Función específica: solo farmers
export const isFarmer: Access = ({ req: { user } }) => {
  return Boolean(
    user && 
    user.collection === 'users' && 
    user.role === 'farmer'
  )
}

// Función específica: solo customers
export const isCustomer: Access = ({ req: { user } }) => {
  return Boolean(
    user && 
    user.collection === 'users' && 
    user.role === 'customer'
  )
}

// Función de ownership: solo el propietario
export const isOwner: Access = ({ req: { user }, id }) => {
  if (!user || user.collection !== 'users') return false
  
  // Comparar ID del documento con ID del usuario
  return user.id === id
}
```

### 6.2 Aplicación en Colecciones

**Archivo**: `src/collections/Farms.ts`

```typescript
import type { CollectionConfig } from 'payload'
import { isFarmer, isAuthenticatedUser } from '@/access/isAuthenticatedUser'

export const Farms: CollectionConfig = {
  slug: 'farms',
  access: {
    // Solo farmers pueden crear farms
    create: isFarmer,
    
    // Todos los usuarios pueden leer farms
    read: isAuthenticatedUser,
    
    // Solo el farmer propietario puede actualizar
    update: ({ req: { user }, id }) => {
      if (!user || user.collection !== 'users' || user.role !== 'farmer') {
        return false
      }
      
      // Verificar ownership (simplificado)
      return { farmer: { equals: user.id } }
    },
    
    // Solo el farmer propietario puede eliminar
    delete: ({ req: { user } }) => {
      if (!user || user.collection !== 'users' || user.role !== 'farmer') {
        return false
      }
      return { farmer: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'farmer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      // Automáticamente asignar el farmer logueado
      defaultValue: ({ user }) => user?.id,
    },
    // ... otros campos
  ],
}
```

---

## Ejemplos Prácticos de Implementación

### Ejemplo 1: Dashboard Condicional por Rol

```tsx
'use client'

import { useAuth } from '@/app/(frontend)/hooks/useAuth'
import FarmerDashboard from './FarmerDashboard'
import CustomerDashboard from './CustomerDashboard'

export default function ConditionalDashboard() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Please login</div>

  switch (user.role) {
    case 'farmer':
      return <FarmerDashboard user={user} />
    case 'customer':
      return <CustomerDashboard user={user} />
    default:
      return <div>Unknown role</div>
  }
}
```

### Ejemplo 2: Hook para Verificar Permisos

```typescript
'use client'

import { useAuth } from './useAuth'

export function usePermissions() {
  const { user } = useAuth()

  return {
    canCreateFarm: user?.role === 'farmer',
    canEditFarm: (farmOwnerId: string) => 
      user?.role === 'farmer' && user.id === farmOwnerId,
    canAddToCart: user?.role === 'customer',
    isLoggedIn: Boolean(user),
  }
}
```

**Uso en componente:**
```tsx
function FarmCard({ farm }) {
  const { canEditFarm } = usePermissions()

  return (
    <div>
      <h3>{farm.name}</h3>
      {canEditFarm(farm.farmer) && (
        <Button>Edit Farm</Button>
      )}
    </div>
  )
}
```

---

## Patrones de Seguridad

### 1. Validación Doble
```typescript
// Verificar en servidor Y cliente
// Server Component
const { user } = await payload.auth({ headers })
if (!user || user.role !== 'farmer') redirect('/unauthorized')

// Client Component  
const { user } = useAuth()
if (!user || user.role !== 'farmer') return <Unauthorized />
```

### 2. Sanitización de Datos
```typescript
// En server actions
export async function updateFarm(id: string, data: any) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  
  // Verificar ownership
  const farm = await payload.findByID({
    collection: 'farms',
    id,
    where: { farmer: { equals: user.id } }
  })
  
  if (!farm) throw new Error('Unauthorized')
  
  // Proceder con actualización
}
```

### 3. Rate Limiting (Concepto)
```typescript
// Implementar con middleware
const loginAttempts = new Map()

export async function login(params: LoginParams) {
  const key = `login:${params.email}`
  const attempts = loginAttempts.get(key) || 0
  
  if (attempts > 5) {
    return { success: false, error: 'Too many attempts' }
  }
  
  // ... resto de lógica
}
```

---

## Siguiente Paso

Después de implementar el sistema de autenticación:

1. **[Slug-Factory-Guide.md](./Slug-Factory-Guide.md)**: Implementar sistema de URLs dinámicas
2. **[04-Cart.md](./04-Cart.md)**: Sistema de carrito para customers
3. **[Collections-Deep-Dive.md](./10-Collections-Deep-Dive.md)**: Modelos de datos avanzados

---

*Este sistema de autenticación proporciona una base sólida y segura para tu aplicación. Cada patrón ha sido probado y optimizado para el ecosistema de Payload CMS + Next.js.*