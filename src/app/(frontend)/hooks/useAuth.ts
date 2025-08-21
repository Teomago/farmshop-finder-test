'use client'

import { useQuery } from '@tanstack/react-query'
import type { User } from '@/payload-types'

export const useAuth = () => {
  const { data, isLoading, isError } = useQuery<(User & { collection: string }) | null>({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me')
      if (!response.ok) {
        // If the response is not OK (e.g., 401 Unauthorized),
        // it means the user is not logged in.
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
