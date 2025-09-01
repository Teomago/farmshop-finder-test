'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import 'mapbox-gl/dist/mapbox-gl.css'
import Map, { NavigationControl, ScaleControl, MapRef } from 'react-map-gl/mapbox'

/**
 * FullMap
 * Componente fullscreen que renderiza un mapa ocupando toda la pantalla sobre un overlay.
 * Usa portal hacia document.body. Incluye botón de cierre y bloquea el scroll del body.
 */
export type FullMapProps = {
  longitude: number
  latitude: number
  zoom?: number
  pitch?: number
  bearing?: number
  minZoom?: number
  maxZoom?: number
  showNavigation?: boolean
  showScale?: boolean
  children?: React.ReactNode
  /** callback al salir (clic en cerrar / Escape) */
  onClose?: () => void
  /** mostrar u ocultar botón por defecto */
  showCloseButton?: boolean
  /** Texto del botón cerrar */
  closeLabel?: string
  /** Clase extra para el overlay (se concatena) */
  overlayClassName?: string
  /** Z-index del overlay (utility arbitraria) */
  zIndex?: number
  /** Lista de capas interactivas (se pasa a Map) */
  interactiveLayerIds?: string[]
  /** Handler de click en el mapa (se pasa a Map) */
  onMapClick?: (e: any) => void
  /** Mostrar el mapa dentro de un marco con márgenes para indicar que la página sigue detrás */
  framed?: boolean
  /** Clases extra para el contenedor en modo framed */
  frameClassName?: string
  animationVariants?: 'fade' | 'fadeScale' | 'slide'
  withStaggerControls?: boolean
}

// Variants para overlay y frame
const overlayVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
  },
}

const frameVariantsMap = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
  },
  fadeScale: {
    initial: { opacity: 0, scale: 0.985, y: 12 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.2, ease: [0.22, 0.9, 0.3, 1] },
    },
    exit: {
      opacity: 0,
      scale: 0.985,
      y: 8,
      transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] },
    },
  },
  slide: {
    initial: { opacity: 0, y: 40 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.24, ease: [0.25, 0.8, 0.3, 1] },
    },
    exit: {
      opacity: 0,
      y: 28,
      transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
    },
  },
}

const controlVariants = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut', delay: 0.1 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
}

export function FullMap({
  longitude,
  latitude,
  zoom = 10,
  pitch = 0,
  bearing = 0,
  minZoom = 1,
  maxZoom = 18,
  showNavigation = true,
  showScale = true,
  children,
  onClose,
  showCloseButton = true,
  closeLabel = 'Cerrar',
  overlayClassName = '',
  zIndex = 100000,
  interactiveLayerIds,
  onMapClick,
  framed = false,
  frameClassName = '',
  animationVariants = 'fadeScale',
  withStaggerControls = false,
}: FullMapProps) {
  const [mounted, setMounted] = useState(false)
  const [viewState, setViewState] = useState({ longitude, latitude, zoom, pitch, bearing })
  const mapRef = useRef<MapRef | null>(null)

  // Marcar montado para evitar SSR mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sincronizar props externas si cambian
  useEffect(() => {
    setViewState((vs) => ({ ...vs, longitude, latitude, zoom }))
  }, [longitude, latitude, zoom])

  // Bloquear scroll del body mientras esté abierto
  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mounted])

  // Escape para cerrar
  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, onClose])

  // Asegurar resize correcto después de montado
  useEffect(() => {
    if (mounted && mapRef.current) {
      // ligero timeout para asegurar que el contenedor calculó layout
      const id = setTimeout(() => mapRef.current?.resize(), 50)
      return () => clearTimeout(id)
    }
  }, [mounted])

  if (!mounted) return null

  const frameVariants = frameVariantsMap[animationVariants] ?? frameVariantsMap.fadeScale
  const overlayVariant = overlayVariants.fade

  const overlay = (
    <motion.div
      className={`fixed inset-0 p-8 flex bg-black/60 backdrop-blur-sm ${overlayClassName}`}
      aria-label="Full screen map"
      role="dialog"
      style={{ zIndex }}
      variants={overlayVariant}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {framed && (
        <div
          className="absolute inset-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.()
          }}
        />
      )}
      <motion.div
        className={
          framed
            ? `relative flex flex-col w-full h-full m-3 md:m-6 lg:m-10 rounded-xl ring-1 ring-white/10 shadow-xl overflow-hidden bg-neutral-950/85 ${frameClassName}`
            : 'relative flex flex-col w-full h-full'
        }
        variants={frameVariants}
      >
        {showCloseButton &&
          (withStaggerControls ? (
            <motion.div
              className={`absolute z-20 flex gap-2 top-3 left-3`}
              variants={withStaggerControls ? controlVariants : undefined}
            >
              <button
                type="button"
                className="px-3 py-1 text-xs rounded border backdrop-blur-sm text-white bg-black/55 border-white/30 hover:bg-black/75 transition-colors"
                onClick={onClose}
                aria-label={closeLabel}
              >
                {closeLabel}
              </button>
            </motion.div>
          ) : (
            <div className="absolute z-20 flex gap-2 top-3 left-3">
              <button
                type="button"
                className="px-3 py-1 text-xs rounded border backdrop-blur-sm text-white bg-black/55 border-white/30 hover:bg-black/75 transition-colors"
                onClick={onClose}
                aria-label={closeLabel}
              >
                {closeLabel}
              </button>
            </div>
          ))}
        <div className="flex-1 relative">
          <Map
            ref={mapRef}
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
            interactiveLayerIds={interactiveLayerIds}
            onClick={onMapClick}
          >
            {showNavigation && (
              <div className="absolute top-2 right-2">
                <NavigationControl visualizePitch={false} />
              </div>
            )}
            {showScale && (
              <div className="absolute left-2 bottom-2">
                <ScaleControl unit="metric" />
              </div>
            )}
            {children}
          </Map>
        </div>
      </motion.div>
    </motion.div>
  )

  return createPortal(overlay, document.body)
}

export default FullMap
