import { headers as getHeaders } from 'next/headers.js'
import Image from 'next/image'
import { getPayload } from 'payload'
import React from 'react'
import { fileURLToPath } from 'url'

import { Image as HeroUiImage } from '@heroui/image'
import { Card, CardHeader, CardFooter } from '@heroui/card'
import { Button } from '@heroui/button'

import config from '@/payload.config'
import './styles.css'
import Hero from './hero'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  const fileURL = `vscode://file/${fileURLToPath(import.meta.url)}`

  return (
    <>
      <div className="flex flex-col justify-center px-6">
        <Card isFooterBlurred className="w-full h-[300px] sm:h-[475px] md:h-[650px] md:m-auto">
          <CardHeader className="absolute z-10 top-1 flex-col items-start">
            <p className="text-tiny text-white/90 uppercase font-bold md:text-2xl">
              Your Farm Here
            </p>
          </CardHeader>
          <HeroUiImage
            removeWrapper
            radius="none"
            alt="Card example background"
            className="z-0 w-full h-full scale-125 -translate-y-6 object-cover"
            src="https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          />
          <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
            <div>
              <p className="text-black text-tiny">Available soon.</p>
              <p className="text-black text-tiny">Get notified.</p>
            </div>
            <Button className="text-tiny bg-[var(--carrot)]/85" radius="full" size="sm">
              Let's find
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
