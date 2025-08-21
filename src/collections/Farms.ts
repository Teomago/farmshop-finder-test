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
    update: ({ req, data }) => {
      const user = req.user
      if (!user) return false
      if (user.collection === 'admins') return true
      if (user.collection !== 'users' || user.role !== 'farmer') return false
      const ownerId =
        data?.owner || (req as unknown as ReqWithOriginalDoc).originalDoc?.owner || null
      return ownerId === user.id
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
    beforeChange: [
      async ({ req, operation, data }) => {
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

        // On update: prevent non-admins from changing owner
        if (operation === 'update') {
          if (data && Object.prototype.hasOwnProperty.call(data, 'owner')) {
            if (!req.user || req.user.collection !== 'admins') {
              throw new Error('Only admins can change the owner of a farm')
            }
            // admin is allowed to change owner
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
      required: true,
      filterOptions: () => ({ role: { equals: 'farmer' } }),
      admin: { description: 'The user who owns this farm.', readOnly: false },
    },
  ],
}
