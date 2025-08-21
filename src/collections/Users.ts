import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    description: 'Usuarios de la aplicación (Farmers y Customers).',
  },
  fields: [
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        {
          label: 'Farmer',
          value: 'farmer',
        },
        {
          label: 'Customer',
          value: 'customer',
        },
      ],
      required: true,
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    // Email added by default
    // Add more fields as needed
  ],
}
