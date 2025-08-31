'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Source, Layer, MapRef } from 'react-map-gl/mapbox'
import { FarmLocation } from './types'
import MapPopup from './MapPopup'
import Link from 'next/link'
// NOTE: We intentionally do NOT use MapBase here to avoid nesting two Map instances.

interface FarmsMapProps {
  farms: FarmLocation[]
  initialZoom?: number
  fallbackZoom?: number
  showDetailLink?: boolean
  clusterColor?: string
  clusterTextColor?: string
  markerColor?: string
  popupOffset?: number
  onSelectFarm?: (farm: FarmLocation) => void
}

export function FarmsMap({
  farms,
  initialZoom = 4,
  fallbackZoom = 2,
  showDetailLink = true,
  clusterColor = '#2563eb',
  clusterTextColor = '#ffffff',
  markerColor = '#f97316',
  // popupOffset reserved for future styling
  onSelectFarm,
}: FarmsMapProps) {
  const validFarms = farms.filter((f) => typeof f.lat === 'number' && typeof f.lng === 'number')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedFarm = validFarms.find((f) => f.id === selectedId) || null
  const mapRef = useRef<MapRef | null>(null)

  // Pre-compute a center for initial view (avoid starting somewhere unrelated)
  let initialCenter = { longitude: 0, latitude: 20 }
  if (validFarms.length > 0) {
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity
    for (const f of validFarms) {
      if (f.lng < minLng) minLng = f.lng
      if (f.lng > maxLng) maxLng = f.lng
      if (f.lat < minLat) minLat = f.lat
      if (f.lat > maxLat) maxLat = f.lat
    }
    if (isFinite(minLng) && isFinite(maxLng) && isFinite(minLat) && isFinite(maxLat)) {
      initialCenter = {
        longitude: (minLng + maxLng) / 2,
        latitude: (minLat + maxLat) / 2,
      }
    } else {
      // fallback: first farm coords
      initialCenter = { longitude: validFarms[0].lng, latitude: validFarms[0].lat }
    }
  }

  // Pre-build GeoJSON FeatureCollection for clusters
  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: validFarms.map((f) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] as [number, number] },
        properties: {
          id: f.id,
          name: f.name,
          slug: f.slug,
          locationText: f.locationText || '',
        },
      })),
    }),
    [validFarms],
  )

  // Fit bounds when farms change
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || validFarms.length === 0) return
    if (validFarms.length === 1) {
      const only = validFarms[0]
      map.flyTo({ center: [only.lng, only.lat], zoom: initialZoom })
      return
    }
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity
    for (const f of validFarms) {
      if (f.lng < minLng) minLng = f.lng
      if (f.lng > maxLng) maxLng = f.lng
      if (f.lat < minLat) minLat = f.lat
      if (f.lat > maxLat) maxLat = f.lat
    }
    if (isFinite(minLng) && isFinite(maxLng) && isFinite(minLat) && isFinite(maxLat)) {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 80, duration: 600 },
      )
    }
  }, [validFarms, initialZoom])

  const handleMapClick = useCallback(() => {
    setSelectedId(null)
  }, [])

  const onEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelectedId(null)
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onEscape])

  return (
    <div className="relative w-full h-full" style={{ minHeight: 400 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_KEY}
        initialViewState={{ ...initialCenter, zoom: fallbackZoom }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        interactiveLayerIds={['clusters', 'cluster-count', 'unclustered-point']}
        style={{ width: '100%', height: '100%' }}
        onClick={(e) => {
          const map = mapRef.current?.getMap()
          if (!map) return
          // More reliable than e.features in some cases
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['unclustered-point', 'clusters'],
          }) as Array<{
            layer: { id: string }
            properties: Record<string, unknown> | null
            geometry: { type: string; coordinates?: [number, number] }
          }>
          const cluster = features.find((f) => f.layer.id === 'clusters')
          const single = features.find((f) => f.layer.id === 'unclustered-point')
          if (process.env.NODE_ENV !== 'production') {
            // Basic debug info to help diagnose no-popup situations
            console.debug('[FarmsMap] click', {
              featureCount: features.length,
              layers: features.map((f) => f.layer.id),
              selectedIdCandidate: single?.properties?.id,
            })
          }
          if (cluster) {
            const clusterId = Number(cluster.properties?.cluster_id)
            if (clusterId == null) return
            const source = map.getSource('farms') as import('mapbox-gl').GeoJSONSource & {
              getClusterExpansionZoom?: (
                id: number,
                cb: (err: unknown, zoom: number) => void,
              ) => void
            }
            source.getClusterExpansionZoom?.(clusterId, (err: unknown, zoom: number) => {
              if (err || typeof zoom !== 'number') return
              if (cluster.geometry.coordinates) {
                map.easeTo({ center: cluster.geometry.coordinates as [number, number], zoom })
              }
            })
            return
          }
          if (single) {
            const props = single.properties || {}
            const id = props.id as string | undefined
            if (id) {
              setSelectedId(id)
              if (onSelectFarm) {
                const f = validFarms.find((vf) => vf.id === id)
                if (f) onSelectFarm(f)
              }
            }
            return
          }
          handleMapClick()
        }}
      >
        {/* Manage cursor pointer for interactive layers only (attach once) */}
        {(() => {
          const baseRef = mapRef.current
          if (!baseRef) return null
          const map = baseRef.getMap() as ReturnType<typeof baseRef.getMap> & {
            __farmCursorBound?: boolean
          }
          if (map && !map.__farmCursorBound) {
            map.__farmCursorBound = true
            const layers = ['clusters', 'cluster-count', 'unclustered-point']
            layers.forEach((l) => {
              map.on('mouseenter', l, () => {
                map.getCanvas().style.cursor = 'pointer'
              })
              map.on('mouseleave', l, () => {
                map.getCanvas().style.cursor = ''
              })
            })
          }
          return null
        })()}
        <Source
          id="farms"
          type="geojson"
          data={geojson as GeoJSON.FeatureCollection}
          cluster
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer
            id="clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': clusterColor,
              'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 25, 28],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'],
              'text-size': 12,
            }}
            paint={{ 'text-color': clusterTextColor }}
          />
          <Layer
            id="unclustered-point"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              // Highlight the selected point with bigger size + different color
              'circle-color': [
                'case',
                ['==', ['get', 'id'], selectedId ?? '__none__'],
                '#dc2626', // selected color (red-600)
                markerColor,
              ],
              'circle-radius': ['case', ['==', ['get', 'id'], selectedId ?? '__none__'], 12, 8],
              'circle-stroke-width': 2,
              'circle-stroke-color': [
                'case',
                ['==', ['get', 'id'], selectedId ?? '__none__'],
                '#ffffff',
                '#ffffff',
              ],
            }}
          />
        </Source>
        {selectedFarm && (
          <MapPopup
            longitude={selectedFarm.lng}
            latitude={selectedFarm.lat}
            onClose={() => setSelectedId(null)}
          >
            <div className="text-xs leading-snug space-y-1 max-w-[260px]">
              {selectedFarm.name && (
                <p className="m-0 font-semibold text-neutral-800!">{selectedFarm.name}</p>
              )}
              {selectedFarm.locationText && (
                <p className="m-0 text-neutral-600!">{selectedFarm.locationText}</p>
              )}
              {showDetailLink && (
                <p className="m-0 pt-1">
                  <Link
                    href={`/farms/${selectedFarm.slug}`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    See Farms →
                  </Link>
                </p>
              )}
            </div>
          </MapPopup>
        )}
      </Map>
    </div>
  )
}
