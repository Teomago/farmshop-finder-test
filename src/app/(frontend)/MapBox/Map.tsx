'use client'
import 'mapbox-gl/dist/mapbox-gl.css'
// import Map from 'react-map-gl'
import Map, { NavigationControl, ScaleControl } from 'react-map-gl/mapbox'
import React, { useState, useEffect } from 'react'

type Props = {
  longitude: number
  latitude: number
  zoom?: number
  children?: React.ReactNode
  showNavigation?: boolean
  showScale?: boolean
  minZoom?: number
  maxZoom?: number
  pitch?: number
  bearing?: number
}

export default function MapView({
  longitude,
  latitude,
  zoom = 10,
  children,
  showNavigation = true,
  showScale = true,
  minZoom = 1,
  maxZoom = 18,
  pitch = 0,
  bearing = 0,
}: Props) {
  const [viewState, setViewState] = useState({ longitude, latitude, zoom, pitch, bearing })

  // Sync internal view state if props change (e.g., new farm center)
  useEffect(() => {
    setViewState((vs) => ({ ...vs, longitude, latitude, zoom }))
  }, [longitude, latitude, zoom])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_KEY}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        minZoom={minZoom}
        maxZoom={maxZoom}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        scrollZoom
        dragPan
        dragRotate={false}
        touchZoomRotate
        doubleClickZoom
        keyboard
      >
        {showNavigation && (
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <NavigationControl visualizePitch={false} />
          </div>
        )}
        {showScale && (
          <div style={{ position: 'absolute', left: 8, bottom: 8 }}>
            <ScaleControl unit="metric" />
          </div>
        )}
        {children}
      </Map>
    </div>
  )
}
