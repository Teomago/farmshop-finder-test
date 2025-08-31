'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import type { FarmLocation } from '../MapBox/types'

const FarmsMap = dynamic(() => import('../MapBox/FarmsMap').then((m) => m.FarmsMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
      Cargando mapa…
    </div>
  ),
})

interface Props {
  farmLocations: FarmLocation[]
}

export default function FarmsMapSection({ farmLocations }: Props) {
  return (
    <div className="w-full mb-8 h-[420px] rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
      {farmLocations.length > 0 ? (
        <FarmsMap farms={farmLocations} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
          No hay granjas con coordenadas todavía.
        </div>
      )}
    </div>
  )
}
