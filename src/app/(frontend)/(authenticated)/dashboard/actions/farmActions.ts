'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import type { Farm } from '@/payload-types'

type ProductEntryInput = {
  product: string
  stock: number
  quantity: number // quantity per bundle
  unit: 'kg' | 'pcs' | 'liters' | 'boxes'
  price: number
}

type FarmDescription = Farm['description']
interface FarmInput {
  name: Farm['name']
  tagline?: Farm['tagline']
  location?: Farm['location']
  description?: FarmDescription
  farmImage?: string
  products?: ProductEntryInput[]
}

type CreateFarmData = {
  name: string
  farmImage: string | Farm['farmImage']
  tagline?: string | null
  location?: string | null
  description?: FarmDescription
  products?: Farm['products']
  owner: string
}

type UpdateFarmData = CreateFarmData

export async function createFarm(data: FarmInput) {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user || user.collection !== 'users' || user.role !== 'farmer') {
    throw new Error('Unauthorized')
  }
  // owner auto-assigned by collection hook
  const createData: CreateFarmData = {
    name: data.name,
    farmImage: data.farmImage ?? '', // temporary placeholder; better require on form
    tagline: data.tagline ?? null,
    location: data.location ?? null,
    description: data.description ?? null,
    products:
      data.products?.map((p) => ({
        product: p.product,
        stock: p.stock,
        quantity: p.quantity,
        unit: p.unit,
        price: p.price,
      })) ?? null,
    owner: user.id as string,
  }
  const created = await payload.create({ collection: 'farms', data: createData })
  revalidatePath('/dashboard')
  return created
}

export async function updateFarm(id: string, data: FarmInput) {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user || user.collection !== 'users' || user.role !== 'farmer') {
    throw new Error('Unauthorized')
  }
  const existing = await payload.findByID({ collection: 'farms', id })
  if (!existing) throw new Error('Farm not found')
  const existingOwner = (existing as Farm).owner
  if (!existingOwner) throw new Error('Farm has no owner')
  const ownerId = typeof existingOwner === 'object' ? existingOwner.id : existingOwner
  if (ownerId !== user.id) throw new Error('Forbidden')
  // Build update object including existing owner (required field)
  const updateData: UpdateFarmData = {
    name: data.name,
    tagline: data.tagline ?? null,
    location: data.location ?? null,
    description: data.description ?? null,
    farmImage:
      data.farmImage ??
      (typeof existing.farmImage === 'object' ? existing.farmImage.id : existing.farmImage) ??
      '',
    products:
      data.products?.map((p) => ({
        product: p.product,
        stock: p.stock,
        quantity: p.quantity,
        unit: p.unit,
        price: p.price,
      })) ?? null,
    owner: ownerId as string,
  }
  const updated = await payload.update({ collection: 'farms', id, data: updateData })
  revalidatePath('/dashboard')
  return updated
}
