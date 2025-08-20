import { getPageByPathname } from '@/module/common/data'
import { resolvePathname } from '@/utils/resolvePathname'
import { notFound } from 'next/navigation'
import React from 'react'
import { BlocksRenderer } from '@/module/blockRender/BlocksRenderer'
import type { Metadata, ResolvingMetadata } from 'next'
import { getSiteURL } from '@/utils/siteUrl'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    segments: string[]
  }>
}

const Pages = async ({ params }: Props) => {
  const { segments } = await params
  const pathname = resolvePathname(segments)
  const page = await getPageByPathname(pathname)

  console.log(page)
  if (!page) notFound()

  return (
    <>
      <div className="flex flex-col items-center justify-center w-full px-4">
        <BlocksRenderer blocks={page?.layout} />
      </div>
    </>
  )
}

// Next.js route segment metadata generator pulling from Payload SEO (meta field)
export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { segments } = await params
  const pathname = resolvePathname(segments)
  const page = await getPageByPathname(pathname)
  if (!page) return {}

  const metaField = (
    page as unknown as { meta?: { title?: string; description?: string; image?: unknown } }
  ).meta
  const title = metaField?.title || page.name
  const description = metaField?.description || `Information about ${page.name}`

  let ogImages: { url: string; alt?: string }[] | undefined
  const img = metaField?.image
  if (img) {
    if (typeof img === 'string') {
      ogImages = [{ url: img }]
    } else if (typeof img === 'object' && img && 'url' in img) {
      const anyImg = img as { url?: unknown; alt?: unknown }
      if (typeof anyImg.url === 'string') {
        ogImages = [{ url: anyImg.url, alt: typeof anyImg.alt === 'string' ? anyImg.alt : title }]
      }
    }
  }

  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImages,
    },
    twitter: {
      title,
      description,
      images: ogImages?.map((i) => i.url),
      card: 'summary',
    },
    alternates: {
      canonical: getSiteURL() ? `${getSiteURL()}${pathname || '/'}` : undefined,
    },
  }
  return metadata
}

// Disabled for Vercel deployment - use dynamic rendering instead
// export const generateStaticParams = async () => {
//   return await getAllPagePathnameSegments()
// }

// export const generateMetadata = async (
//   { params }: Props,
//   parentPromise: ResolvingMetadata,
// ): Promise<Metadata> => {
//   const { segments } = await params
//   const pathname = resolvePathname(segments)
//   const page = await getPageByPathname(pathname)

//   const fallback = await parentPromise

//   return await generateMeta({ meta: page?.meta, fallback, pathname })
// }

export default Pages
