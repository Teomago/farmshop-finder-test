import { Block } from 'payload'

export const Image: Block = {
  slug: 'image',
  interfaceName: 'ImageBlockType',
  fields: [
    {
      name: 'image',
      label: 'Image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
}
