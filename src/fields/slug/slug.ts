import { deepMerge, DeepPartial } from '@/utils/deepMerge'
import type { TextField } from 'payload'
import { formatSlug } from '@/fields/slug/hooks/formatSlug'
import { generateId } from '@/utils/generateId'

type Slug = (fieldToUse?: string, overrides?: DeepPartial<TextField>) => TextField

export const slug: Slug = (fieldToUse = 'title', overrides = {}) =>
  deepMerge(
    {
      name: 'slug',
      type: 'text',
      index: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [formatSlug(fieldToUse)],
        beforeDuplicate: [
          ({ value, context }) => {
            context.duplicate = true
            if (value === '/') {
              return generateId()
            }
            return `${value}-${generateId()}`
          },
        ],
      },
    },
    overrides,
  )
