import { getPayload } from 'payload'
import config from '@/payload.config'
import Farms from '@/app/(frontend)/components/Farms'
import type { Metadata } from 'next'
import { getSiteURL } from '@/utils/siteUrl'

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

  return (
    <div className="flex flex-col w-full text-black items-center justify-center my-4 px-4 min-h-[calc(100vh-15.5rem)] xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)]">
      <h1 className="text-3xl font-bold mb-6">Our Farms</h1>
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
