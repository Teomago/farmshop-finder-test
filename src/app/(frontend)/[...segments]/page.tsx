import { getAllPagePathnameSegments, getPageByPathname } from '@/module/common/data'
import { resolvePathname } from '@/utils/resolvePathname'
import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import path from 'path'
import { getPayload } from 'payload'
import config from '@payload-config'
import React from 'react'

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
      {/* <BlocksRenderer blocks={page?.blocks} /> */}
      {page.name}
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
