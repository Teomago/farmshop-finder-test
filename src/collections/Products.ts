import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'productType'],
  },
  access: {
    create: ({ req: { user } }) => {
      if (!user) return false
      if (user.collection === 'admins') return true
      return user.collection === 'users' && user.role === 'farmer'
    },
    read: () => true,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.collection === 'admins') return true
      return user.collection === 'users' && user.role === 'farmer'
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.collection === 'admins') return true
      return user.collection === 'users' && user.role === 'farmer'
    },
  },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    {
      name: 'productType',
      label: 'Product Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Produce', value: 'produce' },
        { label: 'Dairy', value: 'dairy' },
        { label: 'Meat', value: 'meat' },
        { label: 'Poultry', value: 'poultry' },
      ],
    },
    {
      name: 'productImage',
      label: 'Product Image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    { name: 'description', label: 'Description', type: 'richText' },
  ],
}
