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

import Home from './components/Home'

export const metadata = {
  description: 'An app to find local farmshops.',
  title: 'Farmshop Finder',
}

export default async function HomePage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  const fileURL = `vscode://file/${fileURLToPath(import.meta.url)}`

  const homeConfig = await payload.findGlobal({
    slug: 'home-config',
    depth: 1,
  })

  const configHome = typeof homeConfig.activeHome === 'object' && homeConfig.activeHome 
    ? homeConfig.activeHome.heroinfo 
    : homeConfig.activeHome

  console.log('Config Home:', configHome)
  const homeData = await payload.find({
    collection: 'home',
    depth: 1,
  })
  const activeHome = homeData.docs.find((doc) => doc.heroinfo === configHome)

  return (
    <>
      <div className="flex flex-col justify-center px-6">
        <div>
          <Card
            isFooterBlurred
            className="w-full h-[calc(800px*0.85)] sm:h-[475px] md:h-[650px] xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)]"
          >
            <CardHeader className="absolute z-10 top-1 flex-col items-start">
              <p className="text-tiny text-white/90 uppercase font-bold md:text-2xl">
                {activeHome?.hero.title}
              </p>
            </CardHeader>
            <HeroUiImage
              removeWrapper
              radius="none"
              alt={typeof activeHome?.hero.backgroundImage === 'object' && activeHome?.hero.backgroundImage?.alt ? activeHome.hero.backgroundImage.alt : ''}
              className="z-0 w-full h-full scale-125 -translate-y-6 object-cover"
              src={typeof activeHome?.hero.backgroundImage === 'object' && activeHome?.hero.backgroundImage?.url ? activeHome.hero.backgroundImage.url : ''}
            />
            <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
              <div>
                <p className="text-black text-tiny">{activeHome?.hero.subtitle}</p>
              </div>
              <Button
                href={activeHome?.hero.ctaButton.link}
                className="text-tiny bg-[var(--carrot)]/85"
                radius="full"
                size="sm"
              >
                {activeHome?.hero.ctaButton.text}
              </Button>
            </CardFooter>
          </Card>
        </div>
        <div className="flex flex-col w-full contain-content text-black items-center justify-center my-4 xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)]">
          <div className="flex flex-col items-center justify-center my-2">
            <h1>{activeHome?.bigSection.title}</h1>
            <p>{activeHome?.bigSection.content}</p>
          </div>
          <div className="flex flex-col items-center gap-4 justify-center md:grid md:grid-cols-2 my-2">
            <div className="md:col-span-1">
              <h2>{activeHome?.sectionA.title}</h2>
              <p>{activeHome?.sectionA.content}</p>
            </div>
            <div className="md:col-span-1">
              <h2>{activeHome?.sectionB.title}</h2>
              <p>{activeHome?.sectionB.content}</p>
            </div>
          </div>
        </div>
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
