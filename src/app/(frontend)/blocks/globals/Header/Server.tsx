import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import NavbarCP from '@/app/(frontend)/components/Navbar'

export default async function HeaderServer() {
  const payload = await getPayload({ config })
  const header = await payload.findGlobal({
    slug: 'header',
    depth: 1,
  })

  const navItems = header.nav.map((item, index) => ({
    id: index.toString(),
    label: item.label || 'Default label',
    link: item.link || '#',
  }))

  return (
    <NavbarCP
      title={header.title}
      logoUrl={header.logo.url}
      logoAlt={header.logo.alt}
      navItems={navItems}
    />
  )
}
