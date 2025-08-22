import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Farm, User } from '@/payload-types'
import { FarmerSection } from './components/FarmerSection'
import { WelcomeHeader } from './components/WelcomeHeader'

export default async function DashboardPage() {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })

  if (!user) {
    return <p className="p-8 text-center">No estás autenticado.</p>
  }

  let farm: Farm | null = null
  if (user.collection === 'users' && (user as User).role === 'farmer') {
    const farms = await payload.find({
      collection: 'farms',
      where: { owner: { equals: user.id } },
      limit: 1,
    })
    farm = (farms.docs[0] as Farm) || null
  }

  return (
    <div className="w-full flex flex-col justify-center items-center lg:w-[calc(1024px*0.9)] xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)] gap-6 p-6">
      <WelcomeHeader name={user.name} />
      {user.collection === 'users' && (user as User).role === 'farmer' && (
        <FarmerSection farm={farm} userName={user.name} />
      )}
    </div>
  )
}
