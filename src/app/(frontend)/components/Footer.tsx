'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function Footer({
  logoUrl,
  logoAlt,
  copyright,
  siteLinks,
  socialLinks: _socialLinks,
  policies,
}: {
  copyright: string
  logoUrl: string
  logoAlt: string
  siteLinks: Array<{ id: string; label: string; url: string }>
  socialLinks: Array<{ id: string; label: string; url: string }>
  policies: Array<{ id: string; label: string; url: string }>
}) {
  return (
    <footer className="w-full flex min-h-[4em] h-auto items-center justify-center bg-[var(--carrot)]">
      <div className="w-full max-w-5xl flex flex-col items-center gap-4 py-6 px-6 md:grid md:grid-cols-5 md:gap-4">
        {/* Left column: Site info and links */}
        <div className="flex flex-col gap-2 items-center order-2 md:order-none md:items-start md:col-start-1 md:row-start-1">
          {siteLinks.map((item) => (
            <Link key={item.id} href={item.url}>
              {item.label}
            </Link>
          ))}
        </div>
        {/* Spacer */}
        <div className="hidden md:block md:col-start-2 md:row-start-1"></div>
        {/* Center column: Logo and creator info (first on mobile, center on grid) */}
        <div className="flex flex-col items-center gap-2 order-1 md:order-none md:col-start-3 md:row-start-1">
          <div className="w-12 h-12 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
            <Image src={logoUrl} color="white" alt={logoAlt} width={50} height={50} />
          </div>
          <span className="text-xs text-gray-500">{copyright}</span>
        </div>
        {/* Spacer */}
        <div className="hidden md:block md:col-start-4 md:row-start-1"></div>
        {/* Right column: Terms and policies */}
        <div className="flex flex-col gap-2 items-center order-3 md:order-none md:items-end md:col-start-5 md:row-start-1">
          {policies.map((item) => (
            <Link key={item.id} href={item.url}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
