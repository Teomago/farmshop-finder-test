import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'productType'],
  },
  access: {
    create: ({ req: { user } }) => !!user && user.role === 'farmer', // Solo los 'farmers' pueden crear
    read: () => true, // Todos pueden leer
    update: ({ req: { user }, data }) =>
      !!user && user.role === 'farmer' && user.id === data.farm.owner ? true : false, // Solo el dueño de la granja puede actualizar
    delete: ({ req: { user }, data }) =>
      !!user && user.role === 'farmer' && user.id === data.farm.owner ? true : false, // Solo el dueño de la granja puede eliminar
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
