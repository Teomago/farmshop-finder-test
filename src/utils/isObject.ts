/**
 * Type guard to check if a value is a plain object (not null, not array)
 * @param item - Value to check
 * @returns True if value is a non-null, non-array object
 *
 * @example
 * isObject({}) // true
 * isObject({ a: 1 }) // true
 * isObject([]) // false
 * isObject(null) // false
 * isObject(42) // false
 */
export const isObject = (item: unknown): item is Record<string, unknown> => {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item))
}
