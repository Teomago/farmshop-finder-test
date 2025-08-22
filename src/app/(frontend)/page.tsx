import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import { Image as HeroUiImage } from '@heroui/image'
import { Card, CardHeader, CardFooter } from '@heroui/card'
import { Button } from '@heroui/button'

import config from '@/payload.config'
import type { Media } from '@/payload-types'
import './styles.css'

export const dynamic = 'force-dynamic'

// Type guard to check if image is a Media object
const isMediaObject = (image: string | Media): image is Media => {
  return typeof image === 'object' && image !== null && 'alt' in image && 'url' in image
}

export const metadata = {
  description: 'An app to find local farmshops.',
  title: 'Farmshop Finder',
}

export default async function HomePage() {
  const payload = await getPayload({ config })
  const _headers = await getHeaders()

  const homeConfig = await payload.findGlobal({
    slug: 'home-config',
    depth: 1,
  })

  const configHome =
    typeof homeConfig.activeHome === 'object' && homeConfig.activeHome
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
              alt={
                typeof activeHome?.hero.backgroundImage === 'object' &&
                activeHome?.hero.backgroundImage?.alt
                  ? activeHome.hero.backgroundImage.alt
                  : ''
              }
              className="z-0 w-full h-full scale-125 -translate-y-6 object-cover"
              src={
                typeof activeHome?.hero.backgroundImage === 'object' &&
                activeHome?.hero.backgroundImage?.url
                  ? activeHome.hero.backgroundImage.url
                  : ''
              }
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
            <h1 className="text-[var(--carrot)]">{activeHome?.bigSection.title}</h1>
            <p className="text-[var(--barn)]!">{activeHome?.bigSection.content}</p>
          </div>
          <div className="flex flex-col items-center gap-4 justify-center md:grid md:grid-cols-2 my-2">
            <div className="md:col-span-1">
              <h2 className="text-[var(--carrot)]">{activeHome?.sectionA.title}</h2>
              <p className="text-[var(--barn)]!">{activeHome?.sectionA.content}</p>
            </div>
            <div className="md:col-span-1">
              <h2 className="text-[var(--carrot)]">{activeHome?.sectionB.title}</h2>
              <p className="text-[var(--barn)]!">{activeHome?.sectionB.content}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)] md:flex-row w-full justify-between items-center gap-3 mt-6">
          {activeHome?.btImages?.map((farm) => {
            const farmImage = farm.image
            const imageAlt = isMediaObject(farmImage) ? farmImage.alt || 'Farm image' : 'Farm image'
            const imageUrl = isMediaObject(farmImage) ? farmImage.url : farmImage

            return (
              <div key={farm.id} className="w-full">
                <HeroUiImage
                  isBlurred
                  alt={imageAlt}
                  className="w-[1000px] h-[350px] object-cover"
                  src={imageUrl || ''}
                />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
