'use client'

import React from 'react'
import { Card, CardFooter, CardHeader } from '@heroui/card'
import { Image as HeroUiImage } from '@heroui/image'
import { Farm, Media, Product } from '@/payload-types'
import { isExpanded } from '@/utils/isExpanded'
import { RichText } from '@/module/richText'
import { useAuth } from '../hooks/useAuth'
import { Button } from '@heroui/button'
import { useAddToCart } from '../cart/hooks/useCarts'
import { AddSquare } from '../icons/icons'

export default function FarmDetail({ farm }: { farm: Farm | null }) {
  const { user } = useAuth()
  const { mutate: add, isPending } = useAddToCart()
  if (!farm) return null
  const isCustomer = !!(user && user.collection === 'users' && user.role === 'customer')

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
              // typeof farm.farmImage === 'object' && farm.farmImage?.url ? farm.farmImage.url : ''
              isExpanded<Media>(farm.farmImage) && farm.farmImage?.url ? farm.farmImage.url : ''
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
          <div className="text-sm text-black/70 border rounded p-4 bg-white/50">
            {farm.description ? (
              <RichText data={farm.description} />
            ) : (
              <div className="italic opacity-70">No description provided yet.</div>
            )}
          </div>
        </div>
        <div className="hidden xl:block col-span-1" />
      </div>

      {/* Products grid */}
      {Array.isArray(farm.products) && farm.products.length > 0 && (
        <section className="flex flex-col xl:flex-row w-full h-full xl:w-[calc(1280px*0.9)] 2xl:w-[calc(1536px*0.9)] mt-10 space-y-4 gap-2">
          <h2 className="text-xl font-semibold text-black my-4">Available products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {farm.products.map((p) => {
              const prod = typeof p.product === 'object' ? (p.product as Product) : null
              const image = prod && typeof prod.productImage === 'object' ? prod.productImage : null
              return (
                <Card
                  key={p.id}
                  className="w-full h-auto min-h-[calc(600px*0.85)] sm:min-h-[475px] md:min-h-[475px] overflow-hidden flex flex-col shadow-lg"
                >
                  <CardHeader className="absolute z-10 top-1 flex-col items-start">
                    <div>
                      {isCustomer && (
                        <div className="flex items-end gap-2 mt-2">
                          <span className="text-xl font-bold text-[var(--carrot)] px-2 py-0.5">
                            Add to cart
                          </span>
                          <Button
                            size="sm"
                            isIconOnly
                            radius="sm"
                            isDisabled={isPending || (p.stock ?? 0) <= 0}
                            // className="bg-[var(--carrot)] text-white w-auto px-auto"
                            className={
                              isPending
                                ? 'bg-[var(--carrot)] text-white w-auto px-2'
                                : 'bg-[var(--carrot)] text-white w-auto'
                            }
                            onPress={() => {
                              if (!prod) return
                              add({
                                farmId: farm.id,
                                productId: typeof p.product === 'string' ? p.product : prod.id,
                              })
                            }}
                            aria-label="Add to cart"
                          >
                            {isPending ? (
                              'Adding...'
                            ) : (
                              <AddSquare className="text-white" size={20} />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    {/* Product description placeholder (richText pending) */}
                    <div className="farmDetailRichText">
                      <RichText data={prod?.description} />
                    </div>
                  </CardHeader>
                  {image && (
                    <HeroUiImage
                      removeWrapper
                      radius="none"
                      alt={image.alt || ''}
                      className="z-0 w-full h-full scale-125 -translate-y-6 object-cover"
                      src={image.url || ''}
                    />
                  )}
                  <CardFooter className="absolute flex flex-col bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between w-full">
                    <div className="flex justify-between gap-4">
                      <div className="font-bold text-2xl">{prod ? prod.name : 'Product'}</div>
                      <div className="font-bold text-2xl">€{p.price?.toFixed?.(2) ?? '0.00'}</div>
                    </div>
                    <div className="text-xl opacity-80">Quantity: {p.quantity}</div>
                    <div className="text-xl opacity-80">Stock: {p.stock}</div>
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
