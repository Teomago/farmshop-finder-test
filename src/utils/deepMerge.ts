import { isObject } from '@/utils/isObject'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Recursively merges two objects, including nested properties.
 * Replaces arrays instead of merging them.
 *
 * @param target - Base object to merge into.
 * @param source - Object whose properties will override the target.
 * @returns New merged object without modifying inputs.
 *
 * @example
 * const base = { a: 1, b: { c: 2, d: 3 } };
 * const override = { b: { c: 4 } };
 * deepMerge(base, override); // => { a: 1, b: { c: 4, d: 3 } }
 */
export const deepMerge = <T extends object>(target: T, source: DeepPartial<T>): T => {
  const output = { ...target }

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key as keyof T]
      const targetValue = target[key as keyof T]

      if (sourceValue !== undefined) {
        if (Array.isArray(sourceValue)) {
          // Replace arrays instead of merging them
          output[key as keyof T] = sourceValue as T[keyof T]
        } else if (isObject(sourceValue)) {
          if (isObject(targetValue)) {
            // Recursively merge nested objects
            output[key as keyof T] = deepMerge(
              targetValue as Record<string, unknown>,
              sourceValue as Record<string, unknown>,
            ) as T[keyof T]
          } else {
            // If targetValue is not an object, overwrite with sourceValue
            output[key as keyof T] = sourceValue as T[keyof T]
          }
        } else {
          // Overwrite primitive values
          output[key as keyof T] = sourceValue as T[keyof T]
        }
      }
    })
  }

  return output
}
