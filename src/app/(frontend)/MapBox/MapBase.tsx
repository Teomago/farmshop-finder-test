'use client'

import React from 'react'
import MapView from './Map' // Importamos nuestro nuevo componente

// Mantenemos las mismas props para compatibilidad
export interface MapBaseProps {
  lat?: number | null
  lng?: number | null
  zoom?: number | null
  fallbackZoom?: number
  className?: string
  height?: string | number
  children?: React.ReactNode // Para futuros marcadores y popups
}

/**
 * Wrapper de Mapbox refactorizado para usar el componente base MapView.
 * Se encarga de proveer las coordenadas o una vista por defecto.
 */
export function MapBase({
  lat,
  lng,
  zoom,
  fallbackZoom = 2,
  className = '',
  height = 320,
  children,
}: MapBaseProps) {
  const hasCoords = typeof lat === 'number' && typeof lng === 'number'
  const longitude = hasCoords ? lng : 0
  const latitude = hasCoords ? lat : 20
  const mapZoom = hasCoords && typeof zoom === 'number' ? zoom : fallbackZoom

  const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY

  if (!token) {
    return (
      <div className={`w-full ${className}`.trim()} style={{ height }}>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Error: El token de Mapbox es requerido.
        </p>
      </div>
    )
  }

  return (
    <div className={`w-full ${className}`.trim()} style={{ height }}>
      <MapView longitude={longitude} latitude={latitude} zoom={mapZoom}>
        {children}
      </MapView>
      {!hasCoords && (
        <p className="mt-2 text-xs text-neutral-500">
          No hay coordenadas – mostrando vista global.
        </p>
      )}
    </div>
  )
}
