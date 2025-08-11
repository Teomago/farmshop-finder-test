'use client'

import React from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardFooter } from '@heroui/card'
import { Button } from '@heroui/button'

export type HeroType = {
  headline: string
  backgroundImage: { url: string; alt: string }
}
export type CallToActionType = {
  availableText: string
  notifyText: string
  buttonText: string
}
export type SectionType = { title: string; content: string }
export type GalleryType = { image: { url: string; alt: string } }

export default function Home({
  hero,
  callToAction,
  sections,
  gallery,
}: {
  hero: HeroType
  callToAction: CallToActionType
  sections: SectionType[]
  gallery: GalleryType[]
}) {
  return (
    <div className="flex flex-col justify-center px-6">
      {/* Hero Section */}
      <div>
        <Card
          isFooterBlurred
          className="w-full h-[calc(800px*0.85)] sm:h-[475px] md:h-[650px] xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)]"
        >
          <CardHeader className="absolute z-10 top-1 flex-col items-start">
            <p className="text-tiny text-white/90 uppercase font-bold md:text-2xl">
              {hero.headline}
            </p>
          </CardHeader>
          <Image
            src={hero.backgroundImage.url}
            alt={hero.backgroundImage.alt}
            fill
            className="z-0 scale-125 -translate-y-6 object-cover"
          />
          <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
            <div>
              <p className="text-black text-tiny">{callToAction.availableText}</p>
              <p className="text-black text-tiny">{callToAction.notifyText}</p>
            </div>
            <Button className="text-tiny bg-[var(--carrot)]/85" radius="full" size="sm">
              {callToAction.buttonText}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Content Sections */}
      <div className="flex flex-col w-full contain-content text-black items-center justify-center my-4 xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)]">
        {sections.map((sec, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center my-2">
            <h2>{sec.title}</h2>
            <p>{sec.content}</p>
          </div>
        ))}
      </div>

      {/* Gallery */}
      <div className="flex flex-col xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)] md:flex-row w-full justify-between items-center gap-3 mt-6">
        {gallery.map((item, idx) => (
          <div key={idx} className="w-full relative h-[350px] md:h-auto">
            <Image src={item.image.url} alt={item.image.alt} fill className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  )
}
