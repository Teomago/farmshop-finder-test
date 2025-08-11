import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import Footer from '../../../components/Footer'

export default async function FooterServer() {
  const payload = await getPayload({ config })
  const footer = await payload.findGlobal({
    slug: 'footer',
    depth: 1, // populate upload relation
  })

  const siteLinks = footer.siteLinks.map((item, index) => ({
    id: index.toString(),
    label: item.label || 'Link default label',
    url: item.url || '#',
  }))

  const socialLinks = footer.socialLinks.map((item, index) => ({
    id: index.toString(),
    label: item.platform || 'Link default label',
    url: item.url || '#',
  }))

  const policies = footer.policies.map((item, index) => ({
    id: index.toString(),
    label: item.policyName || 'Link default label',
    url: item.policyLink || '#',
  }))

  return (
    <>
      <Footer
        logoUrl={typeof footer.logo === 'object' && footer.logo?.url ? footer.logo.url : ''}
        logoAlt={typeof footer.logo === 'object' && footer.logo?.alt ? footer.logo.alt : ''}
        copyright={footer.copyright}
        siteLinks={siteLinks}
        socialLinks={socialLinks}
        policies={policies}
      />
    </>
  )
}
