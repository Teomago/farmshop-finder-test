import { Cover } from '@/app/(frontend)/blocks/cover/schema'
import { RichText } from '@/app/(frontend)/blocks/richText/schema'
import { Image } from '@/app/(frontend)/blocks/image/schema'
import { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'layout',
      label: 'Layout',
      type: 'blocks',
      blocks: [Cover, RichText, Image], // Define your blocks here
    },
  ],
}
