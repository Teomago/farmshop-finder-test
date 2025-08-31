'use client'

import React, { useState } from 'react'
import { MapBase } from '../../MapBox/MapBase'
import MapMarker from '../../MapBox/MapMarker'
import MapPopup from '../../MapBox/MapPopup'

interface MapClientProps {
  lat?: number
  lng?: number
  zoom?: number
  name?: string
  locationText?: string
}

export function MapClient({ name, locationText, lat, lng, zoom }: MapClientProps) {
  const [open, setOpen] = useState<boolean>(false)
  const hasCoords = typeof lat === 'number' && typeof lng === 'number'

  return (
    <MapBase lat={lat} lng={lng} zoom={zoom}>
      {hasCoords && (
        <>
          <MapMarker
            longitude={lng!}
            latitude={lat!}
            onClick={() => setOpen(true)}
          />
          {open && (
            <MapPopup longitude={lng!} latitude={lat!} onClose={() => setOpen(false)}>
              <div className="text-xs leading-snug space-y-1 max-w-[260px]">
                {name && <p className="font-semibold text-neutral-800! m-0">{name}</p>}
                {locationText && <p className="m-0 text-neutral-600!">{locationText}</p>}
              </div>
            </MapPopup>
          )}
        </>
      )}
    </MapBase>
  )
}
