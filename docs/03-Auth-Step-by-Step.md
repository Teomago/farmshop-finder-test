# Guía Completa: Construcción del Sistema de Autenticación 🔐

## Tabla de Contenido
1. [Arquitectura del Sistema de Auth](#arquitectura-del-sistema-de-auth)
2. [Paso 1: Configuración de Colecciones Auth en Payload](#paso-1-configuración-de-colecciones-auth-en-payload)
3. [Paso 2: Configuración del Email Adapter](#paso-2-configuración-del-email-adapter)
4. [Paso 3: Implementación de Recuperación de Contraseña](#paso-3-implementación-de-recuperación-de-contraseña)
5. [Paso 4: Implementación de Server Actions](#paso-4-implementación-de-server-actions)
6. [Paso 5: Hook de Autenticación en Frontend](#paso-5-hook-de-autenticación-en-frontend)
7. [Paso 6: Componentes de Login/Logout](#paso-6-componentes-de-loginlogout)
8. [Paso 7: Protección de Rutas](#paso-7-protección-de-rutas)
9. [Paso 8: Control de Acceso por Roles](#paso-8-control-de-acceso-por-roles)
10. [Ejemplos Prácticos de Implementación](#ejemplos-prácticos-de-implementación)
11. [Patrones de Seguridad](#patrones-de-seguridad)

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

## Paso 2: Configuración del Email Adapter

### 4.1 Creación del Brevo Adapter

**Archivo**: `src/utils/brevoAdapter.ts`

```typescript
import { EmailAdapter } from 'payload'
import axios from 'axios'

interface BrevoEmailOptions {
  apiKey?: string
  sender?: {
    name: string
    email: string
  }
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

export default function brevoAdapter(options: BrevoEmailOptions = {}): EmailAdapter {
  const {
    apiKey = process.env.BREVO_API_KEY,
    sender = {
      name: process.env.BREVO_SENDER_NAME || 'Farmshop Finder',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@farmshop-finder.com',
    },
  } = options

  return {
    name: 'brevo',
    
    async sendEmail({ to, subject, html, text }: SendEmailParams) {
      try {
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender,
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text
          },
          {
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json',
            },
          }
        )

        console.log('✅ Email sent successfully via Brevo:', response.data)
        return true
      } catch (error) {
        console.error('❌ Failed to send email via Brevo:', error)
        throw error
      }
    },
  }
}
```

**¿Por qué Brevo?**
- **Confiabilidad**: Alto rate de entrega de emails
- **API Simple**: Integración directa sin complicaciones
- **Costo-efectivo**: Plan gratuito generoso para desarrollo
- **Escalabilidad**: Fácil upgrade cuando la app crezca

### 4.2 Variables de Entorno Requeridas

**Archivo**: `.env.local`

```bash
# Brevo Email Configuration
BREVO_API_KEY=xkeysib-your-brevo-api-key-here
BREVO_SENDER_NAME="Farmshop Finder"
BREVO_SENDER_EMAIL="noreply@farmshop-finder.com"

# Payload Auth Configuration
PAYLOAD_SECRET=your-super-secret-jwt-secret-32-chars
PAYLOAD_AUTH_EXPIRE=7d

# Frontend URLs (for email links)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

**⚠️ Importante**: 
- El email sender debe estar verificado en tu cuenta de Brevo
- PAYLOAD_SECRET debe tener al menos 32 caracteres aleatorios
- En producción, usar HTTPS para FRONTEND_URL

### 4.3 Integración en Payload Config

**Archivo**: `src/payload.config.ts`

```typescript
import brevoAdapter from './utils/brevoAdapter'

export default buildConfig({
  // ... otras configuraciones
  
  email: brevoAdapter({
    // Configuración personalizada (opcional)
    sender: {
      name: 'Tu App Name',
      email: 'noreply@tu-dominio.com',
    },
  }),
  
  // ... resto de configuración
})
```

### 4.4 Testeo del Email Adapter

**Archivo**: `src/scripts/test-email.ts` (para desarrollo)

```typescript
import { getPayload } from 'payload'
import config from '../payload.config'

async function testEmail() {
  const payload = await getPayload({ config })
  
  try {
    await payload.sendEmail({
      to: 'test@ejemplo.com',
      subject: 'Test Email from Farmshop Finder',
      html: `
        <h1>¡Email funcionando correctamente!</h1>
        <p>Este es un email de prueba desde tu aplicación.</p>
        <p>Si recibes este mensaje, la configuración está correcta.</p>
      `,
    })
    
    console.log('✅ Email de prueba enviado exitosamente')
  } catch (error) {
    console.error('❌ Error enviando email de prueba:', error)
  }
}

// Ejecutar: node -r ts-node/register src/scripts/test-email.ts
testEmail()
```

---

## Paso 7: Implementación de Recuperación de Contraseña

### 3.1 Server Action para Solicitar Reset

**Archivo**: `src/app/(frontend)/forgot-password/actions/forgotPassword.ts`

```typescript
'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

interface ForgotPasswordParams {
  email: string
}

export interface ForgotPasswordResponse {
  success: boolean
  message: string
}

export async function forgotPassword({ 
  email 
}: ForgotPasswordParams): Promise<ForgotPasswordResponse> {
  const payload = await getPayload({ config })
  
  try {
    // 1. Verificar que el usuario existe
    const users = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
    })
    
    if (users.docs.length === 0) {
      // Por seguridad, no revelamos si el email existe o no
      return { 
        success: true, 
        message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña.' 
      }
    }
    
    // 2. Generar token de reset de contraseña
    const result = await payload.forgotPassword({
      collection: 'users',
      data: { email },
    })
    
    return { 
      success: true, 
      message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña.' 
    }
    
  } catch (error) {
    console.error('Error en forgot password:', error)
    return { 
      success: false, 
      message: 'Error interno del servidor. Intenta nuevamente.' 
    }
  }
}
```

### 3.2 Configuración de Templates de Email

**Archivo**: `src/collections/Users.ts` (expandido)

```typescript
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Configuración de autenticación avanzada
    tokenExpiration: 60 * 60 * 24 * 7, // 7 días en segundos
    maxLoginAttempts: 5,
    lockTime: 60 * 60 * 2, // 2 horas
    
    // Templates de email personalizados
    forgotPassword: {
      generateEmailHTML: ({ token, user }) => {
        const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
        
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Resetear Contraseña - Farmshop Finder</title>
              <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .button { 
                  display: inline-block; 
                  background: #16a34a; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 6px;
                  margin: 20px 0;
                }
                .footer { padding: 20px; text-align: center; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🌾 Farmshop Finder</h1>
                </div>
                <div class="content">
                  <h2>Resetear tu contraseña</h2>
                  <p>Hola${user.name ? ` ${user.name}` : ''},</p>
                  <p>Recibiste este email porque solicitaste resetear tu contraseña en Farmshop Finder.</p>
                  <p>Haz clic en el botón de abajo para crear una nueva contraseña:</p>
                  <a href="${resetURL}" class="button">Resetear Contraseña</a>
                  <p>O copia y pega este enlace en tu navegador:</p>
                  <p style="word-break: break-all; color: #666;">${resetURL}</p>
                  <p><strong>Este enlace expira en 1 hora por seguridad.</strong></p>
                  <p>Si no solicitaste este cambio, puedes ignorar este email de forma segura.</p>
                </div>
                <div class="footer">
                  <p>© 2024 Farmshop Finder. Conectando agricultura local.</p>
                </div>
              </div>
            </body>
          </html>
        `
      },
      
      generateEmailSubject: () => 'Resetear tu contraseña - Farmshop Finder',
    },
    
    // Configuración de verificación de email (opcional)
    verify: {
      generateEmailHTML: ({ token, user }) => {
        const verifyURL = `${process.env.FRONTEND_URL}/verify-email?token=${token}`
        
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Verificar Email - Farmshop Finder</title>
            </head>
            <body style="font-family: Arial, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #16a34a;">🌾 Bienvenido a Farmshop Finder</h1>
                <p>Hola${user.name ? ` ${user.name}` : ''},</p>
                <p>¡Gracias por registrarte! Por favor verifica tu email haciendo clic en el enlace de abajo:</p>
                <a href="${verifyURL}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  Verificar Email
                </a>
                <p>O copia este enlace: ${verifyURL}</p>
              </div>
            </body>
          </html>
        `
      },
      
      generateEmailSubject: () => 'Verifica tu email - Farmshop Finder',
    },
  },
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
        { label: 'Farmer', value: 'farmer' },
        { label: 'Customer', value: 'customer' },
      ],
      required: true,
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    // Email y password añadidos automáticamente por auth: true
  ],
}
```

### 3.3 Página de Reset Password

**Archivo**: `src/app/(frontend)/reset-password/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { resetPassword } from './actions/resetPassword'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setMessage('Token inválido o faltante.')
      return
    }
    
    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.')
      return
    }
    
    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    
    setIsLoading(true)
    
    try {
      const result = await resetPassword({ token, password })
      
      if (result.success) {
        setIsSuccess(true)
        setMessage('Contraseña actualizada exitosamente. Redirigiendo al login...')
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setMessage(result.error || 'Error reseteando la contraseña.')
      }
    } catch (error) {
      setMessage('Error interno. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardBody>
            <p className="text-red-500">Token inválido o faltante.</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <h1 className="text-2xl font-bold">Resetear Contraseña</h1>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              label="Nueva Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
            
            <Input
              type="password"
              label="Confirmar Contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Repetir la contraseña"
            />
            
            <Button
              type="submit"
              color="primary"
              fullWidth
              isLoading={isLoading}
              disabled={!password || !confirmPassword}
            >
              {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
            
            {message && (
              <p className={isSuccess ? 'text-green-600' : 'text-red-500'}>
                {message}
              </p>
            )}
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
```

**Archivo**: `src/app/(frontend)/reset-password/actions/resetPassword.ts`

```typescript
'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

interface ResetPasswordParams {
  token: string
  password: string
}

export interface ResetPasswordResponse {
  success: boolean
  error?: string
}

export async function resetPassword({ 
  token, 
  password 
}: ResetPasswordParams): Promise<ResetPasswordResponse> {
  const payload = await getPayload({ config })
  
  try {
    // Resetear contraseña usando el token
    const result = await payload.resetPassword({
      collection: 'users',
      data: { token, password },
    })
    
    return { success: true }
    
  } catch (error) {
    console.error('Error resetting password:', error)
    
    // Manejar diferentes tipos de errores
    if (error instanceof Error) {
      if (error.message.includes('token')) {
        return { success: false, error: 'Token inválido o expirado.' }
      }
      if (error.message.includes('password')) {
        return { success: false, error: 'Contraseña no válida.' }
      }
    }
    
    return { 
      success: false, 
      error: 'Error interno del servidor. Intenta nuevamente.' 
    }
  }
}
```

### 3.4 Integración con Componente de Login

**Expansión de**: `src/app/(frontend)/login/page.tsx`

```tsx
// Agregar este enlace en el formulario de login
<div className="text-center mt-4">
  <Link 
    href="/forgot-password" 
    className="text-sm text-blue-600 hover:underline"
  >
    ¿Olvidaste tu contraseña?
  </Link>
</div>
```

**Archivo**: `src/app/(frontend)/forgot-password/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Link } from '@heroui/link'
import { forgotPassword } from './actions/forgotPassword'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const result = await forgotPassword({ email })
      setMessage(result.message)
      setIsSubmitted(true)
    } catch (error) {
      setMessage('Error enviando el email. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <h1 className="text-2xl font-bold">Recuperar Contraseña</h1>
        </CardHeader>
        <CardBody>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-gray-600 text-sm">
                Ingresa tu email y te enviaremos instrucciones para resetear tu contraseña.
              </p>
              
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
              />
              
              <Button
                type="submit"
                color="primary"
                fullWidth
                isLoading={isLoading}
                disabled={!email}
              >
                {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-green-600">{message}</p>
              <p className="text-sm text-gray-600">
                Revisa tu bandeja de entrada y spam.
              </p>
            </div>
          )}
          
          <div className="text-center mt-6">
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              ← Volver al Login
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
```

---

## Paso 8: Implementación de Server Actions

### 4.1 Server Action de Login

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

### 4.2 Server Action de Logout

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

### 4.3 Server Action de Registro (Opcional)

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

## Paso 7: Hook de Autenticación en Frontend

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

## Paso 8: Componentes de Login/Logout

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

## Paso 7: Protección de Rutas

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

## Paso 8: Control de Acceso por Roles

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

### 4. Sanitización de Datos
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