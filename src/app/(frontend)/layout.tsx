import React from 'react'
import './styles.css'
import { Providers } from './providers'

import NavbarCP from './components/Navbar'
import Footer from './components/Footer'

export const metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className="dark">
      <body className="flex flex-col w-full h-auto bg-[var(--bone)]">
        <NavbarCP />
        <Providers>
          <main className="flex flex-col w-auto h-full my-8 justify-center items-center">
            {children}
          </main>
        </Providers>
        <Footer />
      </body>
    </html>
  )
}
