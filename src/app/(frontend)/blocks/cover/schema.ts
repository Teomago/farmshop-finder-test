import { Block } from 'payload'

export const Cover: Block = {
  slug: 'cover',
  interfaceName: 'CoverBlockType',
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'subtitle',
      label: 'Subtitle',
      type: 'text',
      required: true,
    },
  ],
}
