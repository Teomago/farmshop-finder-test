import type { CollectionConfig } from 'payload'
import { slug } from '@/fields/slug/slug'

export const Farms: CollectionConfig = {
  slug: 'farms',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'location'],
  },
  access: {
    create: ({ req: { user } }) => !!user && user.role === 'farmer',
    read: () => true, // Todos pueden leer
    update: ({ req: { user }, data }) =>
      !!user && user.role === 'farmer' && user.id === data.owner ? true : false,
    delete: ({ req: { user }, data }) => !!user && user.role === 'farmer' && user.id === data.owner,
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    // URL slug generated from name
    slug('name'),
    {
      name: 'tagline',
      label: 'Tagline',
      type: 'text',
    },
    {
      name: 'location',
      label: 'Location',
      type: 'text',
    },
    {
      name: 'farmImage',
      label: 'Farm Image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'richText',
    },
    {
      name: 'products',
      label: 'Products Available',
      type: 'array',
      labels: {
        singular: 'Product Entry',
        plural: 'Product Entries',
      },
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
      admin: {
        description: 'The user who owns this farm.',
        readOnly: true,
      },
    },
  ],
}
