import { FieldHook } from 'payload'
import format from 'standard-slugify'

/**
 * 	@param field - field to automatically generate slug from if no slug is manually provided
 * 	@returns {FieldHook} Hook that formats slug on create/update operations
 */
export const formatSlug =
  (field: string): FieldHook =>
  ({ operation, value, previousValue, data, context }) => {
    if (!operation || (operation !== 'create' && operation !== 'update') || context.duplicate) {
      return
    }

    if (value === '/') return value

    if (typeof value === 'string' && value.length > 0 && value !== previousValue) {
      return format(value)
    }

    if (!value && data?.[field]) {
      return format(data[field])
    }
  }
