'use client'

import React from 'react'
import { Card, CardFooter } from '@heroui/card'
import { Image as HeroUiImage } from '@heroui/image'
import type { Farm } from '@/payload-types'

export default function FarmDetail({ farm }: { farm: Farm }) {
  if (!farm) return null

  return (
    <>
      {/* Hero + description row */}
      <div className="flex flex-col xl:flex-row w-full h-full xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)] gap-6 mt-10 space-y-4">
        <Card className="w-full h-[350px] xl:w-4/6 flex flex-col justify-end relative overflow-hidden shadow-lg">
          <HeroUiImage
            removeWrapper
            radius="none"
            alt={
              typeof farm.farmImage === 'object' && farm.farmImage?.alt ? farm.farmImage.alt : ''
            }
            className="z-0 w-full h-[350px] object-cover"
            src={
              typeof farm.farmImage === 'object' && farm.farmImage?.url ? farm.farmImage.url : ''
            }
          />
          <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between w-full">
            <div>
              <h1 className="text-2xl font-bold text-black">{farm.name}</h1>
              {farm.tagline && <p className="text-xs text-black/70">{farm.tagline}</p>}
              {farm.location && <p className="text-xs text-black/70">{farm.location}</p>}
            </div>
          </CardFooter>
        </Card>
        {/* Farm description placeholder (richText pending) */}
        <div className="flex flex-col xl:w-2/3 gap-3 justify-center">
          <h2 className="text-xl font-semibold">About this farm</h2>
          <div className="text-sm text-black/70 italic border rounded p-4 bg-white/50">
            tu descripcion aqui (richText farm pendiente)
          </div>
        </div>
        <div className="hidden xl:block col-span-1" />
      </div>

      {/* Products grid */}
      {Array.isArray(farm.products) && farm.products.length > 0 && (
        <section className="flex flex-col xl:flex-row w-full h-full xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)] mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-black my-4">Available products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {farm.products.map((p) => {
              const prod = typeof p.product === 'object' && p.product ? p.product : null
              const image = prod && typeof prod.productImage === 'object' ? prod.productImage : null
              return (
                <Card key={p.id} className="w-full h-auto overflow-hidden flex flex-col shadow-lg">
                  <div className="w-full bg-gray-200 relative overflow-hidden">
                    {image && (
                      <HeroUiImage
                        removeWrapper
                        radius="none"
                        alt={image.alt || ''}
                        className="z-0 w-full h-[350px] object-cover"
                        src={image.url || ''}
                      />
                    )}
                  </div>
                  <CardFooter className="absolute flex flex-col bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between w-full">
                    <div className="flex justify-between gap-4">
                      <div className="font-bold text-2xl">
                        {prod ? prod.name : 'Product'}
                      </div>
                      <div className="font-bold text-2xl">€{p.price?.toFixed?.(2) ?? '0.00'}</div>
                    </div>
                    <div className="text-xs opacity-70">Qty: {p.quantity}</div>
                    {/* Product description placeholder (richText pending) */}
                    <div className="text-xs text-black/60 italic mt-auto">
                      tu descripcion aqui (richText producto pendiente)
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
