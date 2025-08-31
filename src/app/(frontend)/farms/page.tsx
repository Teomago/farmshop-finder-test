import { getPayload } from 'payload'
import config from '@/payload.config'
import Farms from '@/app/(frontend)/components/Farms'
import type { Metadata } from 'next'
import { getSiteURL } from '@/utils/siteUrl'
import type { FarmLocation } from '../MapBox/types'
// import FarmsMapSection from './FarmsMapSection'
import FarmsMapSection from './FarmsMapSection'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Farms | Farmshop Finder',
  description: 'Browse local farms and their fresh products.',
  alternates: {
    canonical: getSiteURL() ? `${getSiteURL()}/farms` : undefined,
  },
}

export default async function FarmsIndexPage() {
  const payload = await getPayload({ config })
  const farms = await payload.find({ collection: 'farms', draft: false, limit: 100 })

  // Transform docs to FarmLocation[] for the cluster map
  interface FarmDocGeo {
    id: string | number
    slug?: string | null
    name?: string | null
    location?: string | null
    geo?: { lat?: number; lng?: number }
  }
  const farmLocations: FarmLocation[] = (farms.docs as FarmDocGeo[])
    .filter((f) => f.geo && typeof f.geo.lat === 'number' && typeof f.geo.lng === 'number')
    .map((f) => ({
      id: String(f.id),
      slug: f.slug ?? String(f.id),
      name: f.name || 'Unnamed Farm',
      lat: f.geo!.lat!,
      lng: f.geo!.lng!,
      locationText: f.location || '',
    }))

  return (
    <div className="flex flex-col w-full items-center justify-start my-4 px-4 min-h-[calc(100vh-15.5rem)] xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)]">
      <h1 className="text-3xl font-bold mb-6 w-full text-[var(--carrot)]">Our Farms</h1>
      <FarmsMapSection farmLocations={farmLocations} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {farms.docs.map((farm) => (
          <Farms
            key={farm.id}
            farmId={farm.id}
            farmName={farm.name}
            farmLocation={farm.location}
            farmSlug={farm.slug ?? farm.id}
            farmImage={farm.farmImage}
          />
        ))}
      </div>
    </div>
  )
}
