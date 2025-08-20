import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSiteURL } from '@/utils/siteUrl'

export const dynamic = 'force-static'
export const revalidate = 3600

interface SitemapEntry {
  url: string
  lastModified?: string
}

interface PageDoc {
  pathname?: string
  updatedAt?: string
  _status?: string
}
interface FarmDoc {
  slug?: string
  id: string
  updatedAt?: string
}

export default async function sitemap(): Promise<SitemapEntry[]> {
  const site = getSiteURL()
  if (!site) return []
  const payload = await getPayload({ config })

  const pagesRes = await payload.find({ collection: 'pages', limit: 500, depth: 0 })
  const pageUrls: SitemapEntry[] = (pagesRes.docs as PageDoc[])
    .filter((p) => !p._status || p._status === 'published')
    .map((p) => ({
      url: `${site}${p.pathname || ''}`,
      lastModified: p.updatedAt,
    }))

  const farmsRes = await payload.find({ collection: 'farms', limit: 500 })
  const farmUrls: SitemapEntry[] = (farmsRes.docs as FarmDoc[]).map((f) => ({
    url: `${site}/farms/${encodeURIComponent(f.slug || f.id)}`,
    lastModified: f.updatedAt,
  }))

  const staticEntries: SitemapEntry[] = [
    { url: `${site}/`, lastModified: new Date().toISOString() },
    { url: `${site}/farms`, lastModified: new Date().toISOString() },
  ]

  return [...staticEntries, ...pageUrls, ...farmUrls]
}
