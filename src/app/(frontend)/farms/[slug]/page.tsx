import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import FarmDetail from '@/app/(frontend)/components/FarmDetail'

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
}

export default async function FarmDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const farm = await getFarmBySlugOrId(decodeURIComponent(slug))
  if (!farm) return notFound()
  return (
    <div className="flex flex-col w-full items-center justify-center my-4 px-4">
      <FarmDetail farm={farm} />
    </div>
  )
}
