import type { CollectionConfig } from 'payload'

export const Admins: CollectionConfig = {
  slug: 'admins',
  auth: true,
  admin: {
    useAsTitle: 'email',
    description: 'Usuarios con acceso al panel de administración.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    // Email and password are added by default
  ],
}
