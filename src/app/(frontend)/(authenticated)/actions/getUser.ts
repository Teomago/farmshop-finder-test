import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Payload } from 'payload'
import { User } from '@/payload-types'

export async function getUser(): Promise<User | null> {
  const headers = await getHeaders()
  const payload: Payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  if (user && user.collection === 'users' && user.role) {
    return user as User
  }

  return null
}
