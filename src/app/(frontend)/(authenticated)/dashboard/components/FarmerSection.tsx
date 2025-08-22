'use client'
import React, { useState } from 'react'
import type { Farm } from '@/payload-types'
import { Card, CardHeader, CardFooter } from '@heroui/card'
import { Button } from '@heroui/button'
import { Image as HeroUiImage } from '@heroui/image'
import { FarmForm } from './FarmForm'

interface Props {
  farm: Farm | null
  userName?: string | null
}

export function FarmerSection({ farm, userName: _userName }: Props) {
  // Always start in overview, even if no farm exists yet
  const [mode, setMode] = useState<'overview' | 'form'>('overview')

  return mode === 'form' ? (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-2xl font-semibold">{farm ? 'Edit Farm' : 'Create Farm'}</h2>
        <Button size="md" variant="solid" onPress={() => setMode('overview')}>
          Back
        </Button>
      </div>
      <FarmForm farm={farm} onDone={() => setMode('overview')} />
    </div>
  ) : (
    <div className="flex flex-col gap-6">
      {farm ? (
        <>
          <h4>Your Farm</h4>
          <Card className="max-w-xl">
            <CardHeader className="absolute z-10 top-1 flex-col items-start">
              <p className="text-white/90 uppercase font-bold drop-shadow">{farm.name}</p>
            </CardHeader>
            {typeof farm.farmImage === 'object' ? (
              <HeroUiImage
                removeWrapper
                radius="none"
                alt={farm.farmImage?.alt || farm.name}
                className="z-0 w-full h-[300px] object-cover"
                src={farm.farmImage?.url || ''}
              />
            ) : (
              <div className="w-full h-[300px] bg-gray-100 flex items-center justify-center text-gray-500">
                No Image
              </div>
            )}
            <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-end">
              <Button
                color="primary"
                className="bg-[var(--carrot)]/85"
                size="sm"
                onPress={() => setMode('form')}
              >
                Edit
              </Button>
            </CardFooter>
          </Card>
        </>
      ) : (
        <div className="flex flex-col items-start gap-4">
          <p className="text-sm text-gray-600">No farms</p>
          <Button color="primary" className="bg-[var(--carrot)]/85" onPress={() => setMode('form')}>
            Create Farm <span className="ml-1 text-lg leading-none">+</span>
          </Button>
        </div>
      )}
    </div>
  )
}
