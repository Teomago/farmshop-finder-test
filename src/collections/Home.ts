import { CollectionConfig } from 'payload'

export const Home: CollectionConfig = {
  slug: 'home',
  admin: {
    useAsTitle: 'heroinfo',
  },
  fields: [
    {
      name: 'heroinfo',
      label: 'Hero info',
      type: 'text',
      required: true,
    },
    {
      name: 'hero',
      label: 'Hero section',
      type: 'group',
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
        },
        {
          name: 'backgroundImage',
          label: 'Background Image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'subtitle',
          label: 'Subtitle',
          type: 'text',
          required: true,
        },
        {
          name: 'ctaButton',
          label: 'Call to Action Button',
          type: 'group',
          fields: [
            {
              name: 'text',
              label: 'Button Text',
              type: 'text',
              required: true,
            },
            {
              name: 'link',
              label: 'Button Link',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'bigSection',
      label: 'Big Section',
      type: 'group',
      required: true,
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          label: 'Content',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'sectionA',
      label: 'Section A',
      type: 'group',
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          label: 'Content',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'sectionB',
      label: 'Section B',
      type: 'group',
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          label: 'Content',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'btImages',
      label: 'Bottom Images',
      type: 'array',
      fields: [
        {
          name: 'image',
          label: 'Image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
      minRows: 1,
      maxRows: 6,
    },
  ],
}
