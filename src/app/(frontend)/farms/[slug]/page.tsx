import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import FarmDetail from '@/app/(frontend)/components/FarmDetail'
import type { Metadata, ResolvingMetadata } from 'next'
import { getSiteURL } from '@/utils/siteUrl'
import { MapClient } from './MapClient'

// Mark route as dynamic to always fetch fresh data
export const dynamic = 'force-dynamic'

async function getFarmBySlugOrId(slugOrId: string) {
  const payload = await getPayload({ config })
  // Try by slug first
  const bySlug = await payload.find({
    collection: 'farms',
    limit: 1,
    where: { slug: { equals: slugOrId } },
  })
  if (bySlug.docs[0]) return bySlug.docs[0]

  // Fallback: by ID
  try {
    const byId = await payload.findByID({ collection: 'farms', id: slugOrId })
    return byId
  } catch {
    return null
  }
  // const result = await payload.find({
  //   collection: 'farms',
  //   limit: 1,
  //   where: {
  //     or: [{ slug: { equals: slugOrId } }, { id: { equals: slugOrId } }],
  //   },
  // })
}

export default async function FarmDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const farm = await getFarmBySlugOrId(decodeURIComponent(slug))
  if (!farm) return notFound()
  type FarmGeo = { lat?: number; lng?: number; zoom?: number }
  type FarmDocShape = { name?: string; location?: string; geo?: FarmGeo }
  const farmDoc = farm as FarmDocShape
  const geo = farmDoc.geo || {}
  const lat = typeof geo.lat === 'number' ? geo.lat : undefined
  const lng = typeof geo.lng === 'number' ? geo.lng : undefined
  const zoom = typeof geo.zoom === 'number' ? geo.zoom : undefined
  return (
    <div className="flex flex-col w-full items-center justify-center my-4 px-4 gap-6">
      <FarmDetail farm={farm} />
      <div className="w-full max-w-4xl">
        <h3 className="text-sm font-medium mb-2 text-[var(--carrot)]!">Farm Location</h3>
        <MapClient
          lat={lat}
          lng={lng}
          zoom={zoom}
          name={farmDoc.name}
          locationText={farmDoc.location || undefined}
        />
      </div>
    </div>
  )
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params
  const site = getSiteURL()
  return {
    title: `${slug} | Farm Details`,
    alternates: {
      canonical: site ? `${site}/farms/${encodeURIComponent(slug)}` : undefined,
    },
  }
}
