import { NextResponse } from 'next/server'
import { getSiteURL } from '@/utils/siteUrl'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const site = getSiteURL()
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    site ? `Sitemap: ${site}/sitemap.xml` : '',
  ].filter(Boolean)
  return new NextResponse(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
