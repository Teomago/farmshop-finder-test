import { Cover } from '@/app/(frontend)/blocks/cover/schema'
import { RichText } from '@/app/(frontend)/blocks/richText/schema'
import { Image } from '@/app/(frontend)/blocks/image/schema'
import { CollectionConfig } from 'payload'
import { slug } from '@/fields/slug/slug'
import { FieldHook } from 'payload'

export const syncPathname: FieldHook = async ({ data, value, operation }) => {
  if (
    (operation === 'create' || operation === 'update') &&
    data?.breadcrumbs?.at(-1)?.url !== value &&
    data?.breadcrumbs?.at(-1)?.url !== '/undefined'
  ) {
    return data?.breadcrumbs?.at(-1)?.url || ''
  }
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug'],
  },
  access: {
    read: () => true,
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
    },
    maxPerDoc: 50,
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    slug('name', { unique: false }),
    {
      name: 'layout',
      label: 'Layout',
      type: 'blocks',
      blocks: [Cover, RichText, Image],
    },
    {
      name: 'pathname',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [syncPathname],
        beforeValidate: [syncPathname],
      },
    },
  ],
}
