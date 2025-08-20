'use server'

import { cookies } from 'next/headers'

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('payload-token')
}
