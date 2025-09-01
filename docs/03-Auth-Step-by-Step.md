# Guía Completa: Construcción del Sistema de Autenticación 🔐

## Tabla de Contenido
1. [Arquitectura del Sistema de Auth](#arquitectura-del-sistema-de-auth)
2. [Paso 1: Configuración de Colecciones Auth en Payload](#paso-1-configuración-de-colecciones-auth-en-payload)
3. [Paso 2: Configuración del Email Adapter](#paso-2-configuración-del-email-adapter)
4. [Paso 3: Sistema de Recuperación de Contraseña](#paso-3-sistema-de-recuperación-de-contraseña)
5. [Paso 4: Implementación de Server Actions](#paso-4-implementación-de-server-actions)
6. [Paso 5: Hook de Autenticación en Frontend](#paso-5-hook-de-autenticación-en-frontend)
7. [Paso 6: Componentes de Login/Logout/Register](#paso-6-componentes-de-loginlogoutregister)
8. [Paso 7: Protección de Rutas](#paso-7-protección-de-rutas)
9. [Paso 8: Control de Acceso por Roles](#paso-8-control-de-acceso-por-roles)
10. [Configuración de Email Templates](#configuración-de-email-templates)
11. [Ejemplos Prácticos de Implementación](#ejemplos-prácticos-de-implementación)
12. [Patrones de Seguridad](#patrones-de-seguridad)

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

### 2.1 Configuración del Brevo Adapter (Actual)

**Archivo**: `src/utils/brevoAdapter.ts`

```typescript
import { EmailAdapter } from 'payload'

interface BrevoAdapterArgs {
  apiKey: string
  fromEmail: string
  fromName: string
}

const brevoAdapter = ({ apiKey, fromEmail, fromName }: BrevoAdapterArgs): EmailAdapter => ({
  name: 'brevo',
  sendEmail: async ({ to, subject, html, text }) => {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Brevo API error: ${error.message}`)
      }

      const result = await response.json()
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Error sending email via Brevo:', error)
      return { success: false, error: error.message }
    }
  },
})

export default brevoAdapter
```

### 2.2 Configuración en Payload Config

**Archivo**: `src/payload.config.ts`

```typescript
import brevoAdapter from './utils/brevoAdapter'

export default buildConfig({
  // ... otras configuraciones
  
  email: brevoAdapter({
    apiKey: process.env.BREVO_API_KEY!,
    fromEmail: process.env.FROM_EMAIL || 'noreply@farmshop-finder.com',
    fromName: process.env.FROM_NAME || 'Farmshop Finder'
  }),
  
  // ... resto de configuración
})
```

### 2.3 Variables de Entorno

**Archivo**: `.env.local`

```env
# Brevo Configuration
BREVO_API_KEY=your-brevo-api-key-here
FROM_EMAIL=noreply@farmshop-finder.com
FROM_NAME=Farmshop Finder

# Alternative email settings for development
DEV_EMAIL_PROVIDER=console # console | file | smtp
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### 2.4 Email Adapter Alternativo - SMTP

```typescript
// src/utils/smtpAdapter.ts
import nodemailer from 'nodemailer'
import { EmailAdapter } from 'payload'

interface SMTPAdapterArgs {
  host: string
  port: number
  secure?: boolean
  user: string
  pass: string
  fromEmail: string
  fromName: string
}

export const smtpAdapter = (args: SMTPAdapterArgs): EmailAdapter => {
  const transporter = nodemailer.createTransporter({
    host: args.host,
    port: args.port,
    secure: args.secure ?? false,
    auth: {
      user: args.user,
      pass: args.pass,
    },
  })

  return {
    name: 'smtp',
    sendEmail: async ({ to, subject, html, text }) => {
      try {
        const info = await transporter.sendMail({
          from: `${args.fromName} <${args.fromEmail}>`,
          to,
          subject,
          html,
          text,
        })

        return { success: true, messageId: info.messageId }
      } catch (error) {
        console.error('SMTP send error:', error)
        return { success: false, error: error.message }
      }
    },
  }
}
```

### 2.5 Email Adapter para Desarrollo

```typescript
// src/utils/devEmailAdapter.ts
import { EmailAdapter } from 'payload'
import fs from 'fs'
import path from 'path'

export const consoleEmailAdapter = (): EmailAdapter => ({
  name: 'console',
  sendEmail: async ({ to, subject, html, text }) => {
    console.log('\n=== EMAIL DEBUG ===')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Text: ${text}`)
    console.log(`HTML: ${html}`)
    console.log('==================\n')
    
    return { success: true, messageId: `dev-${Date.now()}` }
  },
})

export const fileEmailAdapter = (outputDir: string = './emails'): EmailAdapter => ({
  name: 'file',
  sendEmail: async ({ to, subject, html, text }) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${timestamp}-${to.replace('@', '_at_')}.html`
    const filepath = path.join(outputDir, filename)
    
    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${subject}</title>
  <meta charset="utf-8">
</head>
<body>
  <div style="border: 1px solid #ccc; padding: 20px; margin: 20px;">
    <h2>Email Debug Info</h2>
    <p><strong>To:</strong> ${to}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
  </div>
  <div style="border: 1px solid #ccc; padding: 20px; margin: 20px;">
    <h3>HTML Content:</h3>
    ${html}
  </div>
  <div style="border: 1px solid #ccc; padding: 20px; margin: 20px;">
    <h3>Text Content:</h3>
    <pre>${text}</pre>
  </div>
</body>
</html>
    `
    
    fs.writeFileSync(filepath, emailContent)
    console.log(`📧 Email saved to: ${filepath}`)
    
    return { success: true, messageId: filename }
  },
})
```

**¿Por qué múltiples adapters?**
- **Desarrollo**: Console/file adapters para debugging
- **Producción**: Brevo/SMTP para envío real
- **Flexibilidad**: Fácil cambio entre proveedores
- **Costo**: Brevo más económico que SendGrid/Mailgun

---

## Paso 3: Sistema de Recuperación de Contraseña

### 3.1 Configuración en Collections

**Archivo**: `src/collections/Users.ts` (expansión)

```typescript
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Configuración de autenticación
    tokenExpiration: 7200, // 2 horas
    verify: {
      generateEmailHTML: ({ token, user }) => {
        const verifyURL = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}`
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Welcome to Farmshop Finder!</h1>
            <p>Hello ${user.name || user.email},</p>
            <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
            <a href="${verifyURL}" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Verify Email Address
            </a>
            <p>If the button doesn't work, copy and paste this URL into your browser:</p>
            <p><a href="${verifyURL}">${verifyURL}</a></p>
            <p>This link will expire in 24 hours.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `
      },
      generateEmailSubject: () => 'Verify Your Email - Farmshop Finder'
    },
    forgotPassword: {
      generateEmailHTML: ({ token, user }) => {
        const resetURL = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Password Reset Request</h1>
            <p>Hello ${user.name || user.email},</p>
            <p>We received a request to reset your password for your Farmshop Finder account.</p>
            <a href="${resetURL}" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Reset Password
            </a>
            <p>If the button doesn't work, copy and paste this URL into your browser:</p>
            <p><a href="${resetURL}">${resetURL}</a></p>
            <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
            </p>
          </div>
        `
      },
      generateEmailSubject: () => 'Reset Your Password - Farmshop Finder'
    },
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutos
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
      label: 'Full Name',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'text',
      validate: (val) => {
        if (!val) return true // Optional field
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/
        return phoneRegex.test(val) || 'Please enter a valid phone number'
      }
    },
    {
      name: 'address',
      label: 'Address',
      type: 'group',
      fields: [
        {
          name: 'street',
          label: 'Street Address',
          type: 'text',
        },
        {
          name: 'city',
          label: 'City',
          type: 'text',
        },
        {
          name: 'state',
          label: 'State/Province',
          type: 'text',
        },
        {
          name: 'zipCode',
          label: 'ZIP/Postal Code',
          type: 'text',
        },
        {
          name: 'country',
          label: 'Country',
          type: 'text',
          defaultValue: 'United States',
        }
      ]
    },
    {
      name: 'preferences',
      label: 'Preferences',
      type: 'group',
      fields: [
        {
          name: 'emailNotifications',
          label: 'Email Notifications',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'newsletter',
          label: 'Newsletter Subscription',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'preferredDeliveryDay',
          label: 'Preferred Delivery Day',
          type: 'select',
          options: [
            { label: 'Monday', value: 'monday' },
            { label: 'Tuesday', value: 'tuesday' },
            { label: 'Wednesday', value: 'wednesday' },
            { label: 'Thursday', value: 'thursday' },
            { label: 'Friday', value: 'friday' },
            { label: 'Saturday', value: 'saturday' },
            { label: 'Sunday', value: 'sunday' },
          ]
        }
      ]
    }
  ],
  
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Auto-assign customer role if not specified
        if (operation === 'create' && !data.role) {
          data.role = 'customer'
        }
        
        return data
      }
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation === 'create') {
          // Send welcome email after user creation
          console.log(`New user registered: ${doc.email} (${doc.role})`)
          
          // Track user registration
          if (process.env.NODE_ENV === 'production') {
            // Send to analytics
            await fetch('/api/analytics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'user_registered',
                userId: doc.id,
                role: doc.role,
                timestamp: new Date().toISOString()
              })
            }).catch(console.error)
          }
        }
      }
    ]
  }
}
```

### 3.2 Páginas de Recuperación de Contraseña

**Archivo**: `src/app/(frontend)/forgot-password/page.tsx`

```tsx
import React from 'react'
import { Metadata } from 'next'
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your password to regain access to your account.',
  robots: {
    index: false,
    follow: false,
  }
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
```

**Archivo**: `src/app/(frontend)/reset-password/page.tsx`

```tsx
import React from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import ResetPasswordForm from '../components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Enter your new password.',
  robots: {
    index: false,
    follow: false,
  }
}

interface ResetPasswordPageProps {
  searchParams: {
    token?: string
  }
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  if (!searchParams.token) {
    redirect('/forgot-password')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your new password below.
          </p>
        </div>
        
        <ResetPasswordForm token={searchParams.token} />
      </div>
    </div>
  )
}
```

### 3.3 Componentes de Recuperación

**Archivo**: `src/app/(frontend)/components/auth/ForgotPasswordForm.tsx`

```tsx
'use client'

import React, { useState } from 'react'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Card, CardBody } from '@heroui/card'
import { forgotPassword } from '../../lib/auth'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await forgotPassword(email)
      
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error || 'Failed to send reset email')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardBody className="text-center p-8">
          <div className="text-green-500 text-4xl mb-4">✅</div>
          <h3 className="text-lg font-semibold mb-2">Check your email</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setSuccess(false)}
              className="text-primary-600 hover:text-primary-700 underline"
            >
              try again
            </button>
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onValueChange={setEmail}
            required
            isInvalid={!!error}
            errorMessage={error}
            autoComplete="email"
          />

          <Button
            type="submit"
            color="primary"
            className="w-full"
            isLoading={loading}
            isDisabled={!email.trim()}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <div className="text-center">
            <a
              href="/auth/login"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Back to login
            </a>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
```

**Archivo**: `src/app/(frontend)/components/auth/ResetPasswordForm.tsx`

```tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Card, CardBody } from '@heroui/card'
import { resetPassword } from '../../lib/auth'

interface ResetPasswordFormProps {
  token: string
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const result = await resetPassword(token, password)
      
      if (result.success) {
        // Redirect to login with success message
        router.push('/auth/login?message=password-reset-success')
      } else {
        setError(result.error || 'Failed to reset password')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardBody className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="password"
            label="New Password"
            placeholder="Enter new password"
            value={password}
            onValueChange={setPassword}
            required
            autoComplete="new-password"
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onValueChange={setConfirmPassword}
            required
            isInvalid={confirmPassword.length > 0 && password !== confirmPassword}
            errorMessage={
              confirmPassword.length > 0 && password !== confirmPassword
                ? 'Passwords do not match'
                : ''
            }
            autoComplete="new-password"
          />

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            color="primary"
            className="w-full"
            isLoading={loading}
            isDisabled={!password || !confirmPassword || password !== confirmPassword}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>

          <div className="text-center">
            <a
              href="/auth/login"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Back to login
            </a>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
```

**¿Por qué este sistema de recuperación?**
- **Seguridad**: Tokens con expiración corta
- **UX**: Proceso claro y guided
- **Validación**: Verificación de password strength
- **Feedback**: Mensajes claros en cada paso

---

## Paso 4: Implementación de Server Actions

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

### 4.1 Server Actions de Autenticación

**Archivo**: `src/app/(frontend)/lib/auth.ts`

```typescript
'use server'

import { getPayload } from 'payload'
import config from '../../../payload.config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Tipos
interface LoginParams {
  email: string
  password: string
}

interface RegisterParams {
  email: string
  password: string
  name: string
  role?: 'farmer' | 'customer'
  phone?: string
}

interface AuthResult {
  success: boolean
  user?: any
  error?: string
}

// Login
export async function login({ email, password }: LoginParams): Promise<AuthResult> {
  try {
    const payload = await getPayload({ config })
    
    const result = await payload.login({
      collection: 'users',
      data: { email, password }
    })

    if (result.user) {
      // Set HTTP-only cookie
      const cookieStore = await cookies()
      cookieStore.set('payload-token', result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 días
        path: '/'
      })

      return { 
        success: true, 
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role
        }
      }
    }

    return { success: false, error: 'Invalid credentials' }
  } catch (error: any) {
    console.error('Login error:', error)
    return { success: false, error: error.message || 'Login failed' }
  }
}

// Register
export async function register(params: RegisterParams): Promise<AuthResult> {
  try {
    const payload = await getPayload({ config })
    
    // Verificar si el usuario ya existe
    const existingUser = await payload.find({
      collection: 'users',
      where: {
        email: { equals: params.email }
      },
      limit: 1
    })

    if (existingUser.docs.length > 0) {
      return { success: false, error: 'Email already registered' }
    }

    // Crear nuevo usuario
    const newUser = await payload.create({
      collection: 'users',
      data: {
        email: params.email,
        password: params.password,
        name: params.name,
        role: params.role || 'customer',
        phone: params.phone
      }
    })

    return { 
      success: true, 
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    }
  } catch (error: any) {
    console.error('Registration error:', error)
    return { success: false, error: error.message || 'Registration failed' }
  }
}

// Logout
export async function logout(): Promise<{ success: boolean }> {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    
    // Logout en Payload
    await payload.logout({
      collection: 'users'
    })

    // Limpiar cookie
    cookieStore.delete('payload-token')
    
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: true } // Siempre retorna success para logout
  }
}

// Forgot Password
export async function forgotPassword(email: string): Promise<AuthResult> {
  try {
    const payload = await getPayload({ config })
    
    await payload.forgotPassword({
      collection: 'users',
      data: { email }
    })

    return { success: true }
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return { success: false, error: 'Failed to send reset email' }
  }
}

// Reset Password
export async function resetPassword(token: string, password: string): Promise<AuthResult> {
  try {
    const payload = await getPayload({ config })
    
    await payload.resetPassword({
      collection: 'users',
      data: { token, password }
    })

    return { success: true }
  } catch (error: any) {
    console.error('Reset password error:', error)
    return { success: false, error: error.message || 'Failed to reset password' }
  }
}

// Verify Email
export async function verifyEmail(token: string): Promise<AuthResult> {
  try {
    const payload = await getPayload({ config })
    
    const result = await payload.verifyEmail({
      collection: 'users',
      token
    })

    return { success: true, user: result }
  } catch (error: any) {
    console.error('Email verification error:', error)
    return { success: false, error: error.message || 'Failed to verify email' }
  }
}

// Get Current User
export async function getCurrentUser() {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value

    if (!token) return null

    const user = await payload.auth({
      headers: { Authorization: `JWT ${token}` }
    })

    return user.user
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

// Check User Role
export async function checkUserRole(requiredRole: string): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    return user?.role === requiredRole
  } catch (error) {
    return false
  }
}

// Refresh Token
export async function refreshToken(): Promise<AuthResult> {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const currentToken = cookieStore.get('payload-token')?.value

    if (!currentToken) {
      return { success: false, error: 'No token found' }
    }

    const result = await payload.refresh({
      collection: 'users',
      token: currentToken
    })

    if (result.refreshedToken) {
      // Update cookie with new token
      cookieStore.set('payload-token', result.refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 días
        path: '/'
      })

      return { success: true, user: result.user }
    }

    return { success: false, error: 'Failed to refresh token' }
  } catch (error: any) {
    console.error('Refresh token error:', error)
    return { success: false, error: error.message || 'Token refresh failed' }
  }
}
```

### 4.2 Server Actions para Administradores

**Archivo**: `src/app/(frontend)/lib/adminAuth.ts`

```typescript
'use server'

import { getPayload } from 'payload'
import config from '../../../payload.config'
import { cookies } from 'next/headers'

// Login de admin (separado de users)
export async function adminLogin(email: string, password: string) {
  try {
    const payload = await getPayload({ config })
    
    const result = await payload.login({
      collection: 'admins',
      data: { email, password }
    })

    if (result.user) {
      const cookieStore = await cookies()
      cookieStore.set('admin-token', result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 4, // 4 horas (más corto para admin)
        path: '/admin'
      })

      return { success: true, user: result.user }
    }

    return { success: false, error: 'Invalid admin credentials' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Verificar si es admin
export async function isAdmin(): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('admin-token')?.value

    if (!token) return false

    const user = await payload.auth({
      headers: { Authorization: `JWT ${token}` }
    })

    return !!user.user
  } catch (error) {
    return false
  }
}
```

### 4.3 Rate Limiting y Seguridad

**Archivo**: `src/app/(frontend)/lib/rateLimiter.ts`

```typescript
// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private attempts = new Map<string, RateLimitEntry>()
  private maxAttempts: number
  private windowMs: number

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) { // 15 minutos
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now()
    const entry = this.attempts.get(identifier)

    if (!entry) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return false
    }

    if (now > entry.resetTime) {
      // Reset window
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return false
    }

    if (entry.count >= this.maxAttempts) {
      return true
    }

    entry.count++
    return false
  }

  getRemainingTime(identifier: string): number {
    const entry = this.attempts.get(identifier)
    if (!entry) return 0
    
    const now = Date.now()
    return Math.max(0, entry.resetTime - now)
  }
}

export const loginLimiter = new RateLimiter(5, 15 * 60 * 1000) // 5 intentos por 15 min
export const registerLimiter = new RateLimiter(3, 60 * 60 * 1000) // 3 registros por hora
export const forgotPasswordLimiter = new RateLimiter(3, 60 * 60 * 1000) // 3 solicitudes por hora
```

**¿Por qué server actions separadas?**
- **Seguridad**: Ejecutan en el servidor, protegen lógica sensible
- **Performance**: Evitan round-trips innecesarios
- **Type Safety**: TypeScript end-to-end
- **Rate Limiting**: Control de abuso automático

---

## Paso 5: Hook de Autenticación en Frontend

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

## Paso 6: Componentes de Login/Logout/Register

### 6.1 Componente de Login

**Archivo**: `src/app/(frontend)/components/auth/LoginForm.tsx`

```tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Card, CardBody } from '@heroui/card'
import { Checkbox } from '@heroui/checkbox'
import { Link } from '@heroui/link'
import { login } from '../../lib/auth'
import { loginLimiter } from '../../lib/rateLimiter'

interface LoginFormProps {
  redirectTo?: string
  error?: string
}

export default function LoginForm({ redirectTo, error: initialError }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Check rate limiting
    if (loginLimiter.isRateLimited(email)) {
      const remainingTime = Math.ceil(loginLimiter.getRemainingTime(email) / 1000 / 60)
      setError(`Too many login attempts. Please try again in ${remainingTime} minutes.`)
      setLoading(false)
      return
    }

    try {
      const result = await login({ email, password })
      
      if (result.success) {
        // Success - redirect
        router.push(redirectTo || '/dashboard')
        router.refresh()
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardBody className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onValueChange={setEmail}
            required
            isInvalid={!!error}
            autoComplete="email"
          />

          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onValueChange={setPassword}
            required
            isInvalid={!!error}
            errorMessage={error}
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between">
            <Checkbox
              isSelected={rememberMe}
              onValueChange={setRememberMe}
            >
              Remember me
            </Checkbox>
            
            <Link
              href="/forgot-password"
              size="sm"
              className="text-primary-600 hover:text-primary-700"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            color="primary"
            className="w-full"
            isLoading={loading}
            isDisabled={!email || !password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <div className="text-center">
            <span className="text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
            </span>
            <Link
              href="/auth/register"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Sign up
            </Link>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
```

### 6.2 Componente de Registro

**Archivo**: `src/app/(frontend)/components/auth/RegisterForm.tsx`

```tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Card, CardBody } from '@heroui/card'
import { Select, SelectItem } from '@heroui/select'
import { Checkbox } from '@heroui/checkbox'
import { Link } from '@heroui/link'
import { register } from '../../lib/auth'
import { registerLimiter } from '../../lib/rateLimiter'

export default function RegisterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'customer' as 'farmer' | 'customer',
    phone: '',
    agreeToTerms: false
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.name) {
      newErrors.name = 'Name is required'
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Check rate limiting
    if (registerLimiter.isRateLimited(formData.email)) {
      setErrors({ form: 'Too many registration attempts. Please try again later.' })
      return
    }

    setLoading(true)

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        phone: formData.phone || undefined
      })
      
      if (result.success) {
        // Redirect to verification page or dashboard
        router.push('/auth/verify-email?email=' + encodeURIComponent(formData.email))
      } else {
        setErrors({ form: result.error || 'Registration failed' })
      }
    } catch (err) {
      setErrors({ form: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Card>
      <CardBody className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="text"
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onValueChange={(value) => updateFormData('name', value)}
              required
              isInvalid={!!errors.name}
              errorMessage={errors.name}
              autoComplete="name"
            />

            <Input
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              value={formData.email}
              onValueChange={(value) => updateFormData('email', value)}
              required
              isInvalid={!!errors.email}
              errorMessage={errors.email}
              autoComplete="email"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="password"
              label="Password"
              placeholder="Enter password (min 8 characters)"
              value={formData.password}
              onValueChange={(value) => updateFormData('password', value)}
              required
              isInvalid={!!errors.password}
              errorMessage={errors.password}
              autoComplete="new-password"
            />

            <Input
              type="password"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onValueChange={(value) => updateFormData('confirmPassword', value)}
              required
              isInvalid={!!errors.confirmPassword}
              errorMessage={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Account Type"
              placeholder="Select account type"
              selectedKeys={[formData.role]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string
                updateFormData('role', value)
              }}
            >
              <SelectItem key="customer" value="customer">
                Customer - Buy fresh products
              </SelectItem>
              <SelectItem key="farmer" value="farmer">
                Farmer - Sell your products
              </SelectItem>
            </Select>

            <Input
              type="tel"
              label="Phone Number (Optional)"
              placeholder="Enter your phone number"
              value={formData.phone}
              onValueChange={(value) => updateFormData('phone', value)}
              autoComplete="tel"
            />
          </div>

          <Checkbox
            isSelected={formData.agreeToTerms}
            onValueChange={(checked) => updateFormData('agreeToTerms', checked)}
            isInvalid={!!errors.agreeToTerms}
          >
            <span className="text-sm">
              I agree to the{' '}
              <Link href="/terms" className="text-primary-600 hover:text-primary-700">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
                Privacy Policy
              </Link>
            </span>
          </Checkbox>
          {errors.agreeToTerms && (
            <p className="text-red-500 text-sm">{errors.agreeToTerms}</p>
          )}

          {errors.form && (
            <div className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded">
              {errors.form}
            </div>
          )}

          <Button
            type="submit"
            color="primary"
            className="w-full"
            isLoading={loading}
            isDisabled={!formData.email || !formData.password || !formData.name || !formData.agreeToTerms}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

          <div className="text-center">
            <span className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
            </span>
            <Link
              href="/auth/login"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Sign in
            </Link>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
```

### 6.3 Componente de Logout

**Archivo**: `src/app/(frontend)/components/auth/LogoutButton.tsx`

```tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@heroui/button'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { useDisclosure } from '@heroui/react'
import { logout } from '../../lib/auth'

interface LogoutButtonProps {
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showConfirmation?: boolean
}

export default function LogoutButton({ 
  variant = 'ghost', 
  size = 'md',
  className = '',
  showConfirmation = true
}: LogoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleLogout = async () => {
    setLoading(true)
    
    try {
      await logout()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
      onClose()
    }
  }

  const handleClick = () => {
    if (showConfirmation) {
      onOpen()
    } else {
      handleLogout()
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onPress={handleClick}
        isLoading={loading}
      >
        Sign Out
      </Button>

      {showConfirmation && (
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalContent>
            <ModalHeader>Confirm Sign Out</ModalHeader>
            <ModalBody>
              <p>Are you sure you want to sign out?</p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleLogout}
                isLoading={loading}
              >
                {loading ? 'Signing out...' : 'Sign Out'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  )
}
```

### 6.4 Página de Registro

**Archivo**: `src/app/(frontend)/auth/register/page.tsx`

```tsx
import React from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import RegisterForm from '../../components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join our community of farmers and customers for fresh, local products.',
  robots: {
    index: false,
    follow: false,
  }
}

export default async function RegisterPage() {
  // Redirect if already authenticated
  const user = await getCurrentUser()
  
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Join our community and start discovering fresh, local products
          </p>
        </div>
        
        <RegisterForm />
      </div>
    </div>
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

---

## Configuración de Email Templates

### 10.1 Templates HTML Profesionales

**Archivo**: `src/utils/emailTemplates.ts`

```typescript
interface EmailTemplateProps {
  title: string
  preheader?: string
  content: string
  buttonText?: string
  buttonUrl?: string
  footerText?: string
}

export function createEmailTemplate({
  title,
  preheader,
  content,
  buttonText,
  buttonUrl,
  footerText
}: EmailTemplateProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f8fafc;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .email-header {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      padding: 40px 40px 30px;
      text-align: center;
    }
    
    .logo {
      color: white;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .email-title {
      color: white;
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }
    
    .email-body {
      padding: 40px;
    }
    
    .content-text {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 30px;
    }
    
    .cta-button {
      display: inline-block;
      background-color: #22c55e;
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: background-color 0.2s;
    }
    
    .cta-button:hover {
      background-color: #16a34a;
    }
    
    .fallback-url {
      background-color: #f3f4f6;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
      font-size: 14px;
      color: #6b7280;
      word-break: break-all;
    }
    
    .email-footer {
      background-color: #f9fafb;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer-text {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
    }
    
    .social-links {
      margin: 20px 0;
    }
    
    .social-link {
      display: inline-block;
      margin: 0 10px;
      color: #22c55e;
      text-decoration: none;
    }
    
    @media (max-width: 600px) {
      .email-header, .email-body, .email-footer {
        padding: 20px;
      }
      
      .email-title {
        font-size: 24px;
      }
      
      .cta-button {
        display: block;
        text-align: center;
        margin: 20px 0;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  ` : ''}
  
  <div style="padding: 20px 0;">
    <div class="email-container">
      <div class="email-header">
        <div class="logo">🌱 Farmshop Finder</div>
        <h1 class="email-title">${title}</h1>
      </div>
      
      <div class="email-body">
        <div class="content-text">
          ${content}
        </div>
        
        ${buttonText && buttonUrl ? `
        <div style="text-align: center;">
          <a href="${buttonUrl}" class="cta-button">${buttonText}</a>
        </div>
        
        <div class="fallback-url">
          <strong>Having trouble with the button?</strong><br>
          Copy and paste this URL into your browser:<br>
          <a href="${buttonUrl}" style="color: #22c55e;">${buttonUrl}</a>
        </div>
        ` : ''}
      </div>
      
      <div class="email-footer">
        <div class="social-links">
          <a href="https://facebook.com/farmshopfinder" class="social-link">Facebook</a>
          <a href="https://instagram.com/farmshopfinder" class="social-link">Instagram</a>
          <a href="https://twitter.com/farmshopfinder" class="social-link">Twitter</a>
        </div>
        
        <div class="footer-text">
          ${footerText || `
            <p><strong>Farmshop Finder</strong> - Connecting you with local farmers</p>
            <p>123 Farm Road, Agriculture City, AC 12345</p>
            <p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe" style="color: #22c55e;">Unsubscribe</a> |
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/privacy" style="color: #22c55e;">Privacy Policy</a>
            </p>
          `}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

// Templates específicos
export const emailTemplates = {
  welcome: (name: string, verifyUrl: string) => createEmailTemplate({
    title: 'Welcome to Farmshop Finder!',
    preheader: 'Verify your email to start discovering local farmers',
    content: `
      <p>Hello ${name},</p>
      <p>Welcome to Farmshop Finder! We're excited to help you discover fresh, local products from farmers in your area.</p>
      <p>To get started, please verify your email address by clicking the button below:</p>
    `,
    buttonText: 'Verify Email Address',
    buttonUrl: verifyUrl,
    footerText: `
      <p><strong>Farmshop Finder</strong> - Connecting you with local farmers</p>
      <p>This verification link will expire in 24 hours for security.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `
  }),

  forgotPassword: (name: string, resetUrl: string) => createEmailTemplate({
    title: 'Reset Your Password',
    preheader: 'Click the link below to reset your password',
    content: `
      <p>Hello ${name},</p>
      <p>We received a request to reset your password for your Farmshop Finder account.</p>
      <p>If you made this request, click the button below to reset your password:</p>
    `,
    buttonText: 'Reset Password',
    buttonUrl: resetUrl,
    footerText: `
      <p><strong>Farmshop Finder</strong> - Connecting you with local farmers</p>
      <p><strong>This link will expire in 1 hour for security.</strong></p>
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
    `
  }),

  orderConfirmation: (name: string, orderNumber: string, orderUrl: string) => createEmailTemplate({
    title: 'Order Confirmation',
    preheader: `Your order #${orderNumber} has been confirmed`,
    content: `
      <p>Hello ${name},</p>
      <p>Thank you for your order! We've received your order and will notify you when it's ready for pickup or delivery.</p>
      <p><strong>Order Number:</strong> #${orderNumber}</p>
      <p>You can track your order status by clicking the button below:</p>
    `,
    buttonText: 'View Order Details',
    buttonUrl: orderUrl
  }),

  farmerWelcome: (name: string, farmName: string, dashboardUrl: string) => createEmailTemplate({
    title: 'Welcome to Farmshop Finder, Farmer!',
    preheader: 'Start selling your fresh products online',
    content: `
      <p>Hello ${name},</p>
      <p>Welcome to Farmshop Finder! We're thrilled to have ${farmName} join our community of local farmers.</p>
      <p>Your farmer account is now active. You can start adding your products and manage your farm profile through your dashboard:</p>
    `,
    buttonText: 'Access Farmer Dashboard',
    buttonUrl: dashboardUrl,
    footerText: `
      <p><strong>Farmshop Finder</strong> - Connecting farmers with local customers</p>
      <p>Need help getting started? <a href="mailto:support@farmshop-finder.com" style="color: #22c55e;">Contact our support team</a></p>
    `
  })
}
```

### 10.2 Configuración Avanzada del Email Adapter

**Archivo**: `src/utils/advancedEmailAdapter.ts`

```typescript
import { EmailAdapter } from 'payload'
import { emailTemplates } from './emailTemplates'

interface AdvancedEmailAdapterArgs {
  apiKey: string
  fromEmail: string
  fromName: string
  templateEngine?: 'brevo' | 'sendgrid' | 'custom'
}

export const advancedEmailAdapter = ({
  apiKey,
  fromEmail,
  fromName,
  templateEngine = 'custom'
}: AdvancedEmailAdapterArgs): EmailAdapter => ({
  name: 'advanced-email',
  sendEmail: async ({ to, subject, html, text, data }) => {
    try {
      // Determinar el tipo de email basado en el subject
      let finalHtml = html
      
      if (templateEngine === 'custom') {
        if (subject.includes('Welcome')) {
          finalHtml = emailTemplates.welcome(
            data?.name || to,
            data?.verifyUrl || '#'
          )
        } else if (subject.includes('Reset')) {
          finalHtml = emailTemplates.forgotPassword(
            data?.name || to,
            data?.resetUrl || '#'
          )
        } else if (subject.includes('Order')) {
          finalHtml = emailTemplates.orderConfirmation(
            data?.name || to,
            data?.orderNumber || '000000',
            data?.orderUrl || '#'
          )
        }
      }

      // Enviar via Brevo con template personalizado
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [{ email: to, name: data?.name }],
          subject,
          htmlContent: finalHtml,
          textContent: text,
          tags: [data?.emailType || 'general'],
          // Tracking
          params: {
            userId: data?.userId,
            emailType: data?.emailType,
            timestamp: new Date().toISOString()
          }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Email API error: ${error.message}`)
      }

      const result = await response.json()
      
      // Log successful email para analytics
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/analytics/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'email_sent',
            recipient: to,
            subject,
            emailType: data?.emailType,
            messageId: result.messageId,
            timestamp: new Date().toISOString()
          })
        }).catch(console.error)
      }

      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Advanced email adapter error:', error)
      return { success: false, error: error.message }
    }
  },
})
```

**¿Por qué templates tan elaborados?**
- **Profesionalismo**: Emails que reflejan la calidad de la marca
- **Responsive**: Se ven bien en todos los dispositivos
- **Accesibilidad**: Buena estructura HTML y contraste
- **Tracking**: Integración con analytics y métricas

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