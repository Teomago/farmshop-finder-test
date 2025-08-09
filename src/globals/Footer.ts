import { GlobalConfig } from 'payload'

export const Footer: GlobalConfig = {
  slug: 'footer',
  fields: [
    {
      name: 'logo',
      label: 'Logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'copyright',
      label: 'Copyright',
      type: 'text',
      required: true,
      admin: {
        description: 'Text to display in the footer, e.g., "© 2023 Your Company Name".',
      },
    },
    {
      name: 'siteLinks',
      label: 'Site Links',
      type: 'array',
      fields: [
        {
          name: 'label',
          label: 'Label',
          type: 'text',
        },
        {
          name: 'url',
          label: 'URL',
          type: 'text',
        },
      ],
    },
    {
      name: 'socialLinks',
      label: 'Social Links',
      type: 'array',
      fields: [
        {
          name: 'platform',
          label: 'Platform',
          type: 'text',
        },
        {
          name: 'url',
          label: 'URL',
          type: 'text',
        },
      ],
      minRows: 1,
      maxRows: 5,
      admin: {
        description: 'Add links to your social media profiles.',
      },
    },
    {
      name: 'policies',
      label: 'Policies',
      type: 'array',
      fields: [
        {
          name: 'policyName',
          label: 'Policy Name',
          type: 'text',
        },
        {
          name: 'policyLink',
          label: 'Policy Link',
          type: 'text',
        },
      ],
      admin: {
        description: 'Add links to your terms and conditions, privacy policy, etc.',
      },
      required: true,
    },
  ],
}
