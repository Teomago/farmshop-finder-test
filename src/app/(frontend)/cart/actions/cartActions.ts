'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import type { Farm, Cart, User, Product } from '@/payload-types'

interface AddToCartArgs {
  farmId: string
  productId: string
  bundles?: number
}

type CustomerUser = User & { collection: 'users' }

function isCustomer(user: unknown): user is CustomerUser {
  if (!user || typeof user !== 'object') return false
  const maybe = user as Partial<CustomerUser & { collection?: string }>
  return maybe.collection === 'users' && maybe.role === 'customer'
}

interface CartLineDTO {
  id: string
  productId: string
  productName: string
  bundleSize: number
  unit: string
  bundles: number
  priceEach: number
  subtotal: number
}

export interface CartDTO {
  id: string
  farmId: string
  farmName: string
  lines: CartLineDTO[]
  total: number
}

export async function decrementCartItem({
  cartId,
  productId,
  amount = 1,
}: {
  cartId: string
  productId: string
  amount?: number
}) {
  if (amount <= 0) throw new Error('Invalid amount')
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!isCustomer(user)) throw new Error('Unauthorized')
  const cart = (await payload.findByID({ collection: 'carts', id: cartId, depth: 0 })) as Cart
  if (!cart) throw new Error('Cart not found')
  const ownerId = typeof cart.user === 'string' ? cart.user : cart.user.id
  if (ownerId !== user.id) throw new Error('Forbidden')
  const items = [...(cart.items || [])]
  const idx = items.findIndex(
    (i) => (typeof i.product === 'string' ? i.product : (i.product as Product).id) === productId,
  )
  if (idx === -1) throw new Error('Item not found')
  const currentQty = items[idx].quantity
  const newQty = currentQty - amount
  if (newQty > 0) {
    items[idx] = { ...items[idx], quantity: newQty }
  } else {
    items.splice(idx, 1)
  }
  if (items.length === 0) {
    // delete cart
    await payload.delete({ collection: 'carts', id: cart.id })
    return null
  }
  const updated = (await payload.update({
    collection: 'carts',
    id: cart.id,
    data: { items },
  })) as Cart
  const farmId = typeof updated.farm === 'string' ? updated.farm : updated.farm.id
  const farm = (await payload.findByID({ collection: 'farms', id: farmId, depth: 1 })) as Farm
  return serializeCart(updated, farm)
}

export async function clearAllCarts() {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!isCustomer(user)) throw new Error('Unauthorized')
  const carts = await payload.find({
    collection: 'carts',
    where: { and: [{ user: { equals: user.id } }, { status: { equals: 'active' } }] },
    depth: 0,
    limit: 200,
  })
  let deleted = 0
  for (const c of carts.docs) {
    await payload.delete({ collection: 'carts', id: c.id })
    deleted++
  }
  return { deleted }
}

export async function addToCart({ farmId, productId, bundles = 1 }: AddToCartArgs) {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!isCustomer(user)) throw new Error('Unauthorized')
  if (bundles <= 0) throw new Error('Invalid bundles')
  const farm = (await payload.findByID({ collection: 'farms', id: farmId, depth: 1 })) as Farm
  if (!farm) throw new Error('Farm not found')
  const entry = (farm.products || []).find((p) => {
    const pid = typeof p.product === 'string' ? p.product : p.product?.id
    return pid === productId
  })
  if (!entry) throw new Error('Product not in farm')
  const stock: number = entry.stock ?? 0
  if (bundles > stock) throw new Error('Exceeds stock')
  const priceEach: number = entry.price ?? 0

  // find existing active cart for this farm
  const carts = await payload.find({
    collection: 'carts',
    where: {
      and: [
        { user: { equals: user.id } },
        { farm: { equals: farmId } },
        { status: { equals: 'active' } },
      ],
    },
    depth: 0,
    limit: 1,
  })
  let cart = carts.docs[0] as Cart | undefined

  if (!cart) {
    cart = await payload.create({
      collection: 'carts',
      data: {
        user: user.id,
        farm: farmId,
        items: [
          {
            product: productId,
            quantity: bundles,
            unit: entry.unit,
            priceSnapshot: priceEach,
          },
        ],
        status: 'active',
      },
    })
  } else {
    const items = [...(cart.items || [])]
    const idx = items.findIndex((i) => {
      const pid = typeof i.product === 'string' ? i.product : (i.product as Product | undefined)?.id
      return pid === productId
    })
    if (idx === -1) {
      items.push({
        product: productId,
        quantity: bundles,
        unit: entry.unit,
        priceSnapshot: priceEach,
      })
    } else {
      const newQty = items[idx].quantity + bundles
      if (newQty > stock) throw new Error('Exceeds stock')
      items[idx] = { ...items[idx], quantity: newQty }
    }
    cart = (await payload.update({ collection: 'carts', id: cart.id, data: { items } })) as Cart
  }

  return serializeCart(cart, farm)
}

export async function getCart(farmId: string): Promise<CartDTO | null> {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!isCustomer(user)) return null
  const carts = await payload.find({
    collection: 'carts',
    where: {
      and: [
        { user: { equals: user.id } },
        { farm: { equals: farmId } },
        { status: { equals: 'active' } },
      ],
    },
    depth: 0,
    limit: 1,
  })
  const cart = carts.docs[0] as Cart | undefined
  if (!cart) return null
  const farm = (await payload.findByID({ collection: 'farms', id: farmId, depth: 1 })) as Farm
  return serializeCart(cart, farm)
}

export async function getAllCarts(): Promise<CartDTO[]> {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!isCustomer(user)) return []
  const carts = await payload.find({
    collection: 'carts',
    where: { and: [{ user: { equals: user.id } }, { status: { equals: 'active' } }] },
    depth: 0,
    limit: 50,
  })
  const farmIds = Array.from(new Set(carts.docs.map((c) => (c as Cart).farm)))
  const farms: Record<string, Farm | undefined> = {}
  for (const id of farmIds) {
    try {
      farms[id as string] = (await payload.findByID({
        collection: 'farms',
        id: id as string,
        depth: 1,
      })) as Farm
    } catch {
      // ignore
    }
  }
  return Promise.all(
    carts.docs.map((c) => serializeCart(c as Cart, farms[(c as Cart).farm as string])),
  )
}

async function fillMissingProductNames(lines: CartLineDTO[]): Promise<CartLineDTO[]> {
  const missing = lines.filter((l) => l.productName === l.productId)
  if (missing.length === 0) return lines
  const payload = await getPayload({ config })
  await Promise.all(
    missing.map(async (l) => {
      try {
        const prod = (await payload.findByID({
          collection: 'products',
          id: l.productId,
          depth: 0,
        })) as Product
        if (prod?.name) l.productName = prod.name
      } catch {
        /* ignore */
      }
    }),
  )
  return lines
}

function baseSerialize(cart: Cart, farm?: Farm): CartLineDTO[] {
  return (cart.items || []).map((i) => {
    const pid =
      typeof i.product === 'string' ? i.product : (i.product as Product | undefined)?.id || ''
    const farmEntry = (farm?.products || []).find((p) => {
      const fp = typeof p.product === 'string' ? p.product : (p.product as Product | undefined)?.id
      return fp === pid
    })
    let productName = pid
    if (typeof i.product === 'object' && i.product) {
      productName = (i.product as Product).name
    } else if (farmEntry && typeof farmEntry.product === 'object' && farmEntry.product) {
      productName = (farmEntry.product as Product).name
    }
    const bundleSize = farmEntry?.quantity ?? 0
    return {
      id: pid,
      productId: pid,
      productName,
      bundleSize,
      unit: i.unit,
      bundles: i.quantity,
      priceEach: i.priceSnapshot,
      subtotal: i.quantity * i.priceSnapshot,
    }
  })
}

function finalizeCartDTO(cart: Cart, farm: Farm | undefined, lines: CartLineDTO[]): CartDTO {
  return {
    id: cart.id,
    farmId: typeof cart.farm === 'string' ? (cart.farm as string) : (cart.farm as Farm).id,
    farmName: farm?.name || '',
    lines,
    total: lines.reduce((s, l) => s + l.subtotal, 0),
  }
}

async function serializeCart(cart: Cart, farm?: Farm): Promise<CartDTO> {
  const lines = baseSerialize(cart, farm)
  const needs = lines.some((l) => l.productName === l.productId)
  if (!needs) return finalizeCartDTO(cart, farm, lines)
  const filled = await fillMissingProductNames(lines)
  return finalizeCartDTO(cart, farm, filled)
}
