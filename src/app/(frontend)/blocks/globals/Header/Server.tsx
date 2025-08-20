import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import NavbarCP from '@/app/(frontend)/components/Navbar'
import { headers } from 'next/headers'

export default async function HeaderServer() {
  const payload = await getPayload({ config })

  // Fetch global header data
  const header = await payload.findGlobal({ slug: 'header', depth: 1 })

  // Authenticate user based on incoming request (cookie: payload-token)
  const h = await headers()
  const { user } = await payload.auth({ headers: h })

  const navItems = header.nav.map((item, index) => ({
    id: index.toString(),
    label: item.label || 'Default label',
    link: item.link || '#',
  }))

  return (
    <NavbarCP
      title={header.title}
      logoUrl={typeof header.logo === 'object' && header.logo?.url ? header.logo.url : ''}
      logoAlt={typeof header.logo === 'object' && header.logo?.alt ? header.logo.alt : ''}
      navItems={navItems}
      user={user || null}
    />
  )
}
