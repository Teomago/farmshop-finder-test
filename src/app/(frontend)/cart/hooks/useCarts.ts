'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CartDTO } from '../actions/cartActions'

// Fetch all active carts for current user
export function useAllCarts() {
  const query = useQuery<{ carts: CartDTO[] }>({
    queryKey: ['carts'],
    queryFn: async () => {
      const res = await fetch('/cart/api', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch carts')
      return res.json()
    },
    select: (data) => ({ carts: data.carts || [] }),
    staleTime: 15 * 1000,
  })
  return { ...query, carts: query.data?.carts || [] }
}

export function useCartTotals() {
  const { carts } = useAllCarts()
  let total = 0
  let lineGroups = 0
  let itemCount = 0
  carts.forEach((c) => {
    total += c.total
    lineGroups += c.lines.length
    c.lines.forEach((l) => {
      itemCount += l.bundles
    })
  })
  return { total, lines: lineGroups, itemCount }
}

interface AddArgs {
  farmId: string
  productId: string
  bundles?: number
}

export function useAddToCart() {
  const qc = useQueryClient()
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
      qc.invalidateQueries({ queryKey: ['carts'] })
    },
  })
}

interface DecrementArgs { cartId: string; productId: string; amount?: number }
export function useDecrementItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['decrementCartItem'],
    mutationFn: async ({ cartId, productId, amount = 1 }: DecrementArgs) => {
      const res = await fetch('/cart/api/decrement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, productId, amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Decrement failed')
      return data.cart
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carts'] })
    },
  })
}

export function useClearCarts() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['clearCarts'],
    mutationFn: async () => {
      const res = await fetch('/cart/api/clear', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Clear failed')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carts'] })
    },
  })
}
