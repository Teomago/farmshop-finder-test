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

export const metadata = {
  description: 'An app to find local farmshops.',
  title: 'Farmshop Finder',
}

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  const fileURL = `vscode://file/${fileURLToPath(import.meta.url)}`

  return (
    <>
      <div className="flex flex-col justify-center px-6">
        <Card
          isFooterBlurred
          className="w-full h-[calc(800px*0.85)] sm:h-[475px] md:h-[650px] xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)] md:m-auto"
        >
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
            src="https://images.pexels.com/photos/4818015/pexels-photo-4818015.jpeg?_gl=1*mnulyk*_ga*MTkzMTgxMzM2NC4xNzU0NTY0Nzc4*_ga_8JE65Q40S6*czE3NTQ1NjQ3NzckbzEkZzEkdDE3NTQ1NjQ4MTYkajIxJGwwJGgw"
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
        <div className="flex flex-col xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)] md:flex-row w-full justify-between items-center gap-3 mt-6">
          <div className="w-full">
            <HeroUiImage
              isBlurred
              alt="HeroUI Album Cover1"
              className="w-[1000px] h-[350px] object-cover"
              src="https://images.unsplash.com/photo-1533582802457-6f016a669eca?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            />
          </div>
          <div className="w-full">
            <HeroUiImage
              isBlurred
              alt="HeroUI Album Cover1"
              className="w-[1000px] h-[350px] object-cover"
              src="https://images.unsplash.com/photo-1589738284462-b601bb7d6f51?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            />
          </div>
          <div className="w-full">
            <HeroUiImage
              isBlurred
              alt="HeroUI Album Cover1"
              className="w-[1000px] h-[350px] object-cover"
              src="https://images.unsplash.com/photo-1615281775285-219509089dc1?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            />
          </div>
        </div>
      </div>
    </>
  )
}
