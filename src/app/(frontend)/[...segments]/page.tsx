import { getPageByPathname } from '@/module/common/data'
import { resolvePathname } from '@/utils/resolvePathname'
import { notFound } from 'next/navigation'
import React from 'react'
import { BlocksRenderer } from '@/module/blockRender/BlocksRenderer'

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
      <BlocksRenderer blocks={page?.layout} />
    </>
  )
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
