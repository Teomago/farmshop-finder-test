import type { CollectionConfig } from 'payload'
import { slug } from '@/fields/slug/slug'

interface ReqWithOriginalDoc extends Request {
  originalDoc?: { owner?: string }
  user?: { id?: string; collection: string; role?: string }
}

export const Farms: CollectionConfig = {
  slug: 'farms',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'location'],
  },
  access: {
    create: ({ req: { user } }) => {
      if (!user) return false
      if (user.collection === 'admins') return true
      return user.collection === 'users' && user.role === 'farmer'
    },
    read: () => true,
    update: async ({ req, id }) => {
      const user = req.user
      if (!user) return false
      if (user.collection === 'admins') return true
      if (user.collection !== 'users' || user.role !== 'farmer') return false
      if (!id) return false
      try {
        interface FarmDoc {
          owner?: string | { id?: string }
        }
        const doc = (await req.payload.findByID({ collection: 'farms', id, depth: 0 })) as FarmDoc
        const ownerVal = doc.owner
        const originalOwnerId = typeof ownerVal === 'object' ? ownerVal?.id : ownerVal
        // Allow if they are current owner (even if they will hand over)
        return originalOwnerId === user.id
      } catch {
        return false
      }
    },
    delete: ({ req, data }) => {
      const user = req.user
      if (!user) return false
      if (user.collection === 'admins') return true
      if (user.collection !== 'users' || user.role !== 'farmer') return false
      const ownerId =
        data?.owner || (req as unknown as ReqWithOriginalDoc).originalDoc?.owner || null
      return ownerId === user.id
    },
  },
  hooks: {
    beforeValidate: [
      async ({ req, operation }) => {
        // Enforce: each farmer may own at most one farm
        const user = req.user as { id?: string; collection?: string; role?: string } | undefined
        if (
          operation === 'create' &&
          user &&
          user.collection === 'users' &&
          user.role === 'farmer'
        ) {
          const payload = req.payload
          // Find if a farm already exists for this owner
          const existing = await payload.find({
            collection: 'farms',
            where: { owner: { equals: user.id } },
            limit: 1,
            depth: 0,
          })
          if (existing.docs.length > 0) {
            throw new Error('You already have a farm. Each farmer can only create one farm.')
          }
        }
      },
    ],
    beforeChange: [
      async ({ req, operation, data, originalDoc }) => {
        const user = req.user
        // On create: if farmer, auto-assign owner; if admin, allow provided owner (or none)
        if (operation === 'create') {
          if (user && user.collection === 'users' && user.role === 'farmer') {
            return { ...data, owner: user.id }
          }
          // admins may set owner explicitly when creating
          if (user && user.collection === 'admins') {
            return data
          }
          return data
        }

        // On update: allow owner change by admin OR by current (original) owner handing over
        if (operation === 'update') {
          if (data && Object.prototype.hasOwnProperty.call(data, 'owner')) {
            type OwnerVal = string | { id?: string } | null | undefined
            const extractId = (o: OwnerVal) => (typeof o === 'object' ? o?.id : o)
            const originalOwnerId = extractId(
              (originalDoc as { owner?: OwnerVal } | undefined)?.owner,
            )
            const incomingOwnerId = extractId((data as { owner?: OwnerVal }).owner)
            // If unchanged, just remove to reduce noise
            if (originalOwnerId && originalOwnerId === incomingOwnerId) {
              delete (data as { owner?: OwnerVal }).owner
              return data
            }
            // Allow change if admin
            if (req.user && req.user.collection === 'admins') return data
            // Allow handover if current user is the original owner (farmer)
            if (
              req.user &&
              req.user.collection === 'users' &&
              req.user.role === 'farmer' &&
              originalOwnerId === req.user.id
            ) {
              return data
            }
            // Otherwise block
            throw new Error('Only admins or the current owner can change the owner of a farm')
          }
        }

        return data
      },
    ],
  },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    slug('name'),
    { name: 'tagline', label: 'Tagline', type: 'text' },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'farmImage', label: 'Farm Image', type: 'upload', relationTo: 'media', required: true },
    { name: 'description', label: 'Description', type: 'richText' },
    {
      name: 'products',
      label: 'Products Available',
      type: 'array',
      labels: { singular: 'Product Entry', plural: 'Product Entries' },
      fields: [
        {
          name: 'product',
          label: 'Product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'quantity',
          label: 'Quantity',
          type: 'number',
          min: 0,
          required: true,
          defaultValue: 0,
        },
        {
          name: 'unit',
          label: 'Unit',
          type: 'select',
          options: [
            { label: 'kg', value: 'kg' },
            { label: 'pcs', value: 'pcs' },
            { label: 'liters', value: 'liters' },
            { label: 'boxes', value: 'boxes' },
          ],
          required: true,
          defaultValue: 'kg',
        },
        {
          name: 'price',
          label: 'Price (EUR)',
          type: 'number',
          min: 0,
          required: true,
          defaultValue: 0,
        },
      ],
    },
    {
      name: 'owner',
      label: 'Owner',
      type: 'relationship',
      relationTo: 'users',
      // Required only on create; allow omitted on update so we don't have to send it every time
      required: false,
      filterOptions: () => ({ role: { equals: 'farmer' } }),
      validate: (val: unknown, options: { operation?: string }) => {
        if (options?.operation === 'create' && !val) return 'Owner required'
        return true
      },
      admin: { description: 'The user who owns this farm.', readOnly: false },
    },
  ],
}
