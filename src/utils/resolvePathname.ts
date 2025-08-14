/**
 * Resolves Next.js catch-all and optional catch-all route parameters to a pathname
 * @param {string | string[] | undefined} param - Route parameter from [...segments] or [[...segments]]
 * @returns {string} Normalized pathname with leading slash
 *
 * @example
 * // app/(frontend)/[...segments]/page.tsx
 * const pathname = resolvePathname(params.segments)
 * // param: ['blog', 'post-1'] => '/blog/post-1'
 * // param: 'about' => '/about'
 * // param: undefined => '/'
 *
 * @example
 * // app/(frontend)/[[...segments]]/page.tsx
 * const pathname = resolvePathname(params.segments)
 * // param: ['docs', 'api'] => '/docs/api'
 * // param: undefined => '/' (optional catch-all)
 */
export const resolvePathname = (param: string | string[] | undefined): string => {
  if (typeof param === 'string') {
    return param
  }

  if (Array.isArray(param)) {
    return `/${param.join('/')}`
  }

  return '/'
}
