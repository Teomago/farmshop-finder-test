import React from 'react'
import './styles.css'
import { HeroUIProviderWrapper as HeroUIProvider } from './providers/heroUIProvider'

import HeaderServer from './blocks/globals/Header/Server'
import FooterServer from './blocks/globals/Footer/Server'

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className="dark">
      <body className="flex flex-col w-full h-auto bg-[var(--bone)]">
        <HeroUIProvider>
          <HeaderServer />
          <main className="flex flex-col w-auto h-full my-8 justify-center items-center">
            {children}
          </main>
          <FooterServer />
        </HeroUIProvider>
      </body>
    </html>
  )
}
