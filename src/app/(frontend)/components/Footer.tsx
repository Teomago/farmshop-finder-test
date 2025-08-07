'use client'

import React from 'react'

export default function Footer() {
  return (
    <footer
      className="w-full flex h-auto items-center justify-center bg-[var(--carrot)]"
      style={{ minHeight: '4rem' }}
    >
      <div className="w-full max-w-5xl flex flex-col items-center gap-4 py-6 px-6 md:grid md:grid-cols-5 md:gap-4">
        {/* Left column: Site info and links */}
        <div className="flex flex-col gap-2 items-center order-2 md:order-none md:items-start md:col-start-1 md:row-start-1">
          <span className="font-bold text-lg">SiteName</span>
          <a href="#about" className="text-sm hover:underline">
            About
          </a>
          <a href="#features" className="text-sm hover:underline">
            Features
          </a>
          <a href="#contact" className="text-sm hover:underline">
            Contact
          </a>
        </div>
        {/* Spacer */}
        <div className="hidden md:block md:col-start-2 md:row-start-1"></div>
        {/* Center column: Logo and creator info (first on mobile, center on grid) */}
        <div className="flex flex-col items-center gap-2 order-1 md:order-none md:col-start-3 md:row-start-1">
          <div className="w-12 h-12 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">Logo</span>
          </div>
          <span className="text-xs text-gray-500">Created by Teomago</span>
        </div>
        {/* Spacer */}
        <div className="hidden md:block md:col-start-4 md:row-start-1"></div>
        {/* Right column: Terms and policies */}
        <div className="flex flex-col gap-2 items-center order-3 md:order-none md:items-end md:col-start-5 md:row-start-1">
          <a href="#terms" className="text-sm hover:underline">
            Terms & Conditions
          </a>
          <a href="#privacy" className="text-sm hover:underline">
            Privacy Policy
          </a>
          <a href="#help" className="text-sm hover:underline">
            Help
          </a>
        </div>
      </div>
    </footer>
  )
}
