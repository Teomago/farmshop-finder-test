'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'

interface RegisterParams {
  name: string
  email: string
  password: string
  role: 'farmer' | 'customer'
}

export interface RegisterResponse {
  success: boolean
  error?: string
}

export async function register({
  name,
  email,
  password,
  role,
}: RegisterParams): Promise<RegisterResponse> {
  const payload = await getPayload({ config })
  try {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      return { success: false, error: 'Email already registered' }
    }

    if (!['farmer', 'customer'].includes(role)) {
      return { success: false, error: 'Invalid role' }
    }
    if (password.length < 6) return { success: false, error: 'Password too short (min 6)' }

    await payload.create({
      collection: 'users',
      data: { name, email, password, role },
    })

    const loginRes = await payload.login({ collection: 'users', data: { email, password } })
    if (loginRes?.token) {
      const cookieStore = await cookies()
      cookieStore.set('payload-token', loginRes.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
    }

    return { success: true }
  } catch (e) {
    console.error('Register error', e)
    return { success: false, error: 'Registration failed' }
  }
}
