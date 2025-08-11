import { GlobalConfig } from 'payload'

export const HomeConfig: GlobalConfig = {
  slug: 'home-config',
  fields: [
    {
      name: 'activeHome',
      label: 'Active Home',
      type: 'relationship',
      relationTo: 'home',
      required: true,
    },
  ],
}
