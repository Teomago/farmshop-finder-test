import 'server-only'
import { CollectionSlug, getPayload, PaginatedDocs } from 'payload'
import { Config } from '@/payload-types'
import config from '@payload-config'
import { cache } from '@/utils/cache'
import { draftMode } from 'next/headers'
import { getPathSegments } from '@/utils/getPathSegments'

type FindOneBySlugArgs = {
  collection: CollectionSlug
  slug: string
}

export const findOneBySlugData = async <S extends CollectionSlug>(
  { collection, slug }: FindOneBySlugArgs & { collection: S },
  draft: boolean = false,
): Promise<PaginatedDocs<Config['collections'][S]>['docs'][0] | null> => {
  const payload = await getPayload({ config })

  const res = await payload.find({
    collection,
    draft,
    overrideAccess: draft,
    limit: 1,
    pagination: false,
    disableErrors: true,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return res.docs[0] || null
}

const getCachedFindOneBySlugData = cache(
  async <S extends CollectionSlug>({ collection, slug }: FindOneBySlugArgs & { collection: S }) => {
    console.log(`Cached Miss for findOne - collection: ${collection} - slug: ${slug}`)
    return findOneBySlugData({ collection, slug }, false)
  },
  { tags: ({ collection, slug }) => [collection, slug] },
)

export const findOneBySlug = async <S extends CollectionSlug>({
  collection,
  slug,
}: FindOneBySlugArgs & { collection: S }): Promise<
  PaginatedDocs<Config['collections'][S]>['docs'][0] | null
> => {
  try {
    const { isEnabled: draft } = await draftMode()

    if (draft) {
      return findOneBySlugData({ collection, slug }, true)
    }

    return getCachedFindOneBySlugData({ collection, slug })
  } catch (_error) {
    console.error(`Error fetching - collection: ${collection} - slug: ${slug}`)
    return null
  }
}

export const getPageData = async (pathname: string, draft: boolean) => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    disableErrors: true,
    where: {
      pathname: {
        equals: pathname,
      },
    },
  })

  return docs?.[0] || null
}

const getCachedPageData = cache(
  async (pathname: string) => {
    console.log(`Cache Miss at: ${pathname}`)
    return getPageData(pathname, false)
  },
  { tags: (pathname) => ['pages', pathname] },
)

export const getPageByPathname = async (pathname: string) => {
  try {
    const { isEnabled: draft } = await draftMode()

    if (draft) {
      return getPageData(pathname, true)
    }

    return getCachedPageData(pathname)
  } catch (error) {
    console.error('Error fetching page:', error)
    return null
  }
}

export const getAllPagePathnameSegments = async () => {
  try {
    const payload = await getPayload({ config })
    const pages = await payload.find({
      collection: 'pages',
      draft: false,
      limit: 0,
      overrideAccess: false,
      select: {
        pathname: true,
      },
    })

    const paths = pages?.docs
      ?.filter(
        (page): page is typeof page & { pathname: string } => typeof page?.pathname === 'string',
      )
      .map((page) => ({
        segments: getPathSegments(page.pathname),
      }))

    return paths || []
  } catch {
    return []
  }
}

// export const getNavigationSettings = cache(
//   async () => {
//     try {
//       const payload = await getPayload({ config })
//       const navigation = await payload.findGlobal({ slug: 'navigation' })

//       return navigation ?? null
//     } catch {
//       return null
//     }
//   },
//   { tags: ['navigation'] },
// )

// export const getSeoSettings = cache(
//   async () => {
//     try {
//       const payload = await getPayload({ config })
//       const seo = await payload.findGlobal({ slug: 'seo' })

//       return seo ?? null
//     } catch {
//       return null
//     }
//   },
//   { tags: ['seo'] },
// )
