import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'productType'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
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
    {
      name: 'description',
      label: 'Description',
      type: 'richText',
    },
  ],
}
