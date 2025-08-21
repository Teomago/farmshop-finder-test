import type { CollectionConfig } from 'payload'

export const Carts: CollectionConfig = {
  slug: 'carts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'farm', 'updatedAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.collection === 'admins') return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      if (user.collection === 'admins') return true
      return user.collection === 'users' && user.role === 'customer'
    },
    update: ({ req: { user }, data }) => {
      if (!user) return false
      if (user.collection === 'admins') return true
      return data?.user === user.id
    },
    delete: ({ req: { user }, data }) => {
      if (!user) return false
      if (user.collection === 'admins') return true
      return data?.user === user.id
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'farm',
      type: 'relationship',
      relationTo: 'farms',
      required: true,
    },
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Item', plural: 'Items' },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          min: 1,
          required: true,
          defaultValue: 1,
        },
        {
          name: 'unit',
          type: 'text',
          required: true,
        },
        {
          name: 'priceSnapshot',
          label: 'Price Snapshot (EUR)',
          type: 'number',
          required: true,
          min: 0,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Ordered', value: 'ordered' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ],
}
