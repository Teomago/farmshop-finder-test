import { cache as reactCache } from 'react'
import { unstable_cache as nextCache } from 'next/cache'

type CacheOptions = {
  revalidate?: number | false
  tags?: string[] | ((...args: any[]) => string[])
}

/**
 * Combines React's cache (for deduping requests) with Next.js unstable_cache (for persistent caching).
 * Allows dynamic tags based on function arguments for targeted revalidation.
 * @see https://nextjs.org/docs/app/api-reference/functions/unstable_cache#parameters
 * @param fn - Async function to cache
 * @param options - Cache configuration
 * @param options.revalidate - Cache duration in seconds, or false for infinite
 * @param options.tags - Static tags array or function returning dynamic tags based on args
 * @param closureVars - External variables used in fn but not passed as args
 * @returns Cached function with identical signature to fn
 *
 * @example
 * // Basic usage with static tags
 * const getCachedPosts = cache(
 *   async () => db.posts.findMany(),
 *   { tags: ['posts'] }
 * )
 *
 * @example
 * // Dynamic tags based on arguments
 * const getCachedPost = cache(
 *   async (id: string) => db.posts.findUnique({ where: { id } }),
 *   {
 *     tags: (id) => [`post-${id}`]
 *   }
 * )
 *
 * @example
 * // With closure variables
 * const userId = '123'
 * const getUserPosts = cache(
 *   async () => db.posts.findMany({ where: { userId } }),
 *   { tags: [`user-${userId}-posts`] },
 *   [userId] // Declare closure var
 * )
 */
export const cache = <TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: CacheOptions,
  closureVars?: string[],
) =>
  reactCache((...args: TArgs) =>
    nextCache(fn, closureVars, {
      revalidate: options?.revalidate,
      tags: typeof options?.tags === 'function' ? options.tags(...args) : options?.tags,
    })(...args),
  )
