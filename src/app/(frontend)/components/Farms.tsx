'use client'

import React from 'react'
import { Card, CardHeader, CardFooter } from '@heroui/card'
import { Image as HeroUiImage } from '@heroui/image'
import Link from 'next/link'

export default function Farms({
  farmId,
  farmName,
  farmLocation,
  farmSlug,
  farmImage,
}: {
  farmId: string
  farmName: string
  farmLocation: string | null | undefined
  farmSlug: string
  farmImage: any | { url: string; alt?: string } | string
}) {
  return (
    <Card
      isFooterBlurred
      className="w-full h-[350px] flex flex-col justify-end relative overflow-hidden"
    >
      <HeroUiImage
        removeWrapper
        radius="none"
        alt={typeof farmImage === 'object' && farmImage?.alt ? farmImage.alt : ''}
        className="z-0 w-full h-[350px] object-cover"
        src={typeof farmImage === 'object' && farmImage?.url ? farmImage.url : ''}
      />
      <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between w-full">
        <div>
          <p className="text-black text-tiny font-semibold">{farmName}</p>
          {farmLocation && <p className="text-xs text-black/70">{farmLocation}</p>}
        </div>
        <Link
          href={`/farms/${farmSlug ?? farmId}`}
          className="text-tiny bg-[var(--carrot)]/85 px-4 py-2 rounded-full text-white font-semibold transition hover:bg-[var(--carrot)]"
        >
          View details
        </Link>
      </CardFooter>
    </Card>
  )
}
