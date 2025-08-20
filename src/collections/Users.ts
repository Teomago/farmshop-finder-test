import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    tokenExpiration: 7200,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 24 hours
  },
  fields: [
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
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
