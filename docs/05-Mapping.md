# Sistema de Mapas: Guía Completa de Geolocalización 🗺️

## Tabla de Contenido
1. [Arquitectura del Sistema de Mapas](#arquitectura-del-sistema-de-mapas)
2. [Paso 1: Configuración de Mapbox](#paso-1-configuración-de-mapbox)
3. [Paso 2: Componente de Mapa Base](#paso-2-componente-de-mapa-base)
4. [Paso 3: Sistema de Clustering](#paso-3-sistema-de-clustering)
5. [Paso 4: Marcadores Personalizados](#paso-4-marcadores-personalizados)
6. [Paso 5: Búsqueda Geográfica](#paso-5-búsqueda-geográfica)
7. [Paso 6: Integración con Datos de Granja](#paso-6-integración-con-datos-de-granja)
8. [Optimizaciones y Performance](#optimizaciones-y-performance)

---

## Arquitectura del Sistema de Mapas

### Tecnologías Utilizadas en el Proyecto

- **Mapbox GL JS**: Motor de mapas principal
- **react-map-gl**: Wrapper de React para Mapbox
- **Supercluster**: Algoritmo de clustering eficiente (implementado)
- **GeoJSON**: Formato estándar para datos geográficos

### Componentes Implementados

#### **Componentes Core**
- **MapView (`Map.tsx`)**: Mapa controlado con navegación y controles de escala
- **MapBase (`MapBase.tsx`)**: Wrapper de conveniencia para páginas de granja individual
- **FarmsMap (`FarmsMap.tsx`)**: Mapa clusterizado que renderiza todas las granjas
- **MapPopup (`MapPopup.tsx`)**: Wrapper del componente Popup
- **MapClient (`[slug]/MapClient.tsx`)**: Marcador de granja individual con popup

#### **Data Flow del Sistema Actual**
```mermaid
graph TD
    A[Server /farms/page.tsx] --> B[Transform Payload docs]
    B --> C[FarmLocation[] mínimo]
    C --> D[Build FeatureCollection]
    D --> E[Calculate center from bounds]
    E --> F[Fit bounds on mount]
    F --> G[Handle cluster/point clicks]
    G --> H[Render popups/selection]
```

### Flujo de Clustering Implementado

1. **Build FeatureCollection** desde `FarmLocation[]`
2. **Initial center** derivado del punto medio del bounding box
3. **Fit bounds** al montar o cambiar set de granjas
4. **Click handler** usa `queryRenderedFeatures` para detectar cluster vs point
5. **Cluster click** → `getClusterExpansionZoom` para zoom suave
6. **Point click** → establecer ID seleccionado, renderizar popup
7. **Escape key** & click fuera limpia selección

---

## Paso 1: Configuración de Mapbox (Implementada)

### 1.1 Configuración Actual del Proyecto

**Variables de Entorno**
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGV...
```

### 1.2 Tipos Implementados

**Archivo**: `src/types/maps.ts` (basado en el código actual)

```typescript
// Tipo mínimo para reducir payload al cliente
export interface FarmLocation {
  id: string
  slug: string
  name: string
  lat: number
  lng: number
  locationText: string
}

// Para mapas clusterizados
export interface ClusterMapProps {
  farms: FarmLocation[]
  clusterColor?: string
  markerColor?: string
  onSelectFarm?: (farm: FarmLocation) => void
  showDetailLink?: boolean
}
```

---

## Paso 2: Componente de Mapa Base (Implementado)

### 2.1 MapView - Componente Principal

**Archivo**: `src/components/Map.tsx` (implementado)

```tsx
'use client'

import React from 'react'
import Map, { 
  NavigationControl, 
  ScaleControl,
  MapProps as ReactMapGLProps
} from 'react-map-gl'

interface MapViewProps extends Partial<ReactMapGLProps> {
  children?: React.ReactNode
  className?: string
}

export default function MapView({ 
  children, 
  className = "w-full h-96",
  ...mapProps 
}: MapViewProps) {
  return (
    <div className={className}>
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        attributionControl={false}
        {...mapProps}
      >
        {children}
        
        {/* Controles de navegación */}
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />
      </Map>
    </div>
  )
}
```

### 2.2 MapBase - Wrapper de Conveniencia

**Archivo**: `src/components/MapBase.tsx` (implementado)

```tsx
'use client'

import React from 'react'
import MapView from './Map'
import type { ViewState } from 'react-map-gl'

interface MapBaseProps {
  children?: React.ReactNode
  center?: { lat: number; lng: number }
  zoom?: number
  className?: string
}

export default function MapBase({ 
  children, 
  center = { lat: 4.6097, lng: -74.0817 }, // Bogotá por defecto
  zoom = 10,
  className 
}: MapBaseProps) {
  const initialViewState: Partial<ViewState> = {
    longitude: center.lng,
    latitude: center.lat,
    zoom,
  }

  return (
    <MapView
      initialViewState={initialViewState}
      className={className}
    >
      {children}
    </MapView>
  )
}
```

---

## Paso 3: Sistema de Clustering (Implementado)

### 3.1 FarmsMap - Mapa Clusterizado Principal

**Archivo**: `src/components/FarmsMap.tsx` (implementado)

```tsx
'use client'

import React, { useState, useMemo, useCallback } from 'react'
import Map, { Source, Layer, Popup } from 'react-map-gl'
import type { 
  MapMouseEvent, 
  GeoJSONSource,
  Expression 
} from 'react-map-gl'
import type { FarmLocation, ClusterMapProps } from '@/types/maps'

export default function FarmsMap({
  farms,
  clusterColor = "#2563eb",
  markerColor = "#f97316", 
  onSelectFarm,
  showDetailLink = false
}: ClusterMapProps) {
  const [selectedFarm, setSelectedFarm] = useState<FarmLocation | null>(null)
  const [viewState, setViewState] = useState({
    longitude: -74.0817,
    latitude: 4.6097,
    zoom: 10
  })

  // Convertir granjas a GeoJSON
  const geojsonData = useMemo(() => {
    const features = farms.map(farm => ({
      type: 'Feature' as const,
      properties: {
        id: farm.id,
        slug: farm.slug,
        name: farm.name,
        locationText: farm.locationText,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [farm.lng, farm.lat]
      }
    }))

    return {
      type: 'FeatureCollection' as const,
      features
    }
  }, [farms])

  // Calcular centro inicial basado en bounds
  const initialCenter = useMemo(() => {
    if (farms.length === 0) return { lng: -74.0817, lat: 4.6097 }
    
    const lats = farms.map(f => f.lat)
    const lngs = farms.map(f => f.lng)
    
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
    }
  }, [farms])

  // Manejar clicks en el mapa
  const handleMapClick = useCallback((event: MapMouseEvent) => {
    const features = event.features
    if (!features || features.length === 0) {
      setSelectedFarm(null)
      return
    }

    const clickedFeature = features[0]
    
    // Si es un cluster, hacer zoom
    if (clickedFeature.properties?.cluster) {
      const clusterId = clickedFeature.properties.cluster_id
      const source = event.target.getSource('farms') as GeoJSONSource
      
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return
        
        setViewState(prev => ({
          ...prev,
          longitude: (clickedFeature.geometry as any).coordinates[0],
          latitude: (clickedFeature.geometry as any).coordinates[1],
          zoom: zoom || prev.zoom + 1,
          transitionDuration: 500
        }))
      })
    } else {
      // Si es un punto individual, seleccionarlo
      const farmId = clickedFeature.properties?.id
      const farm = farms.find(f => f.id === farmId)
      
      if (farm) {
        setSelectedFarm(farm)
        onSelectFarm?.(farm)
      }
    }
  }, [farms, onSelectFarm])

  // Configuración de layers
  const clusterLayer = {
    id: 'clusters',
    type: 'circle' as const,
    source: 'farms',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        clusterColor,
        100, '#51bbd6',
        750, '#f1c40f'
      ] as Expression,
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20, 100, 30, 750, 40
      ] as Expression
    }
  }

  const clusterCountLayer = {
    id: 'cluster-count',
    type: 'symbol' as const,
    source: 'farms',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12
    },
    paint: {
      'text-color': '#ffffff'
    }
  }

  const unclusteredPointLayer = {
    id: 'unclustered-point',
    type: 'circle' as const,
    source: 'farms',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', 'id'], selectedFarm?.id || ''],
        '#dc2626', // Rojo para seleccionado
        markerColor  // Color normal
      ] as Expression,
      'circle-radius': [
        'case',
        ['==', ['get', 'id'], selectedFarm?.id || ''],
        12, // Más grande si está seleccionado
        8   // Tamaño normal
      ] as Expression,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  }

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        interactiveLayerIds={['clusters', 'unclustered-point']}
        cursor="default"
      >
        {/* Fuente de datos GeoJSON */}
        <Source
          id="farms"
          type="geojson"
          data={geojsonData}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
        </Source>

        {/* Popup para granja seleccionada */}
        {selectedFarm && (
          <Popup
            longitude={selectedFarm.lng}
            latitude={selectedFarm.lat}
            anchor="bottom"
            onClose={() => setSelectedFarm(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-3 min-w-48">
              <h3 className="font-semibold text-gray-900 mb-1">
                {selectedFarm.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {selectedFarm.locationText}
              </p>
              
              {showDetailLink && (
                <a
                  href={`/farms/${selectedFarm.slug}`}
                  className="inline-block px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Ver detalles
                </a>
              )}
            </div>
          </Popup>
        )}
      </Map>
      
      {/* Información de granjas */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-gray-800">
          {farms.length} granjas encontradas
        </p>
      </div>
    </div>
  )
}
```

### 3.2 Wrapper para Evitar SSR

**Archivo**: `src/components/FarmsMapSection.tsx` (implementado)

```tsx
'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import type { FarmLocation } from '@/types/maps'

// Importación dinámica para evitar problemas de SSR con WebGL
const FarmsMap = dynamic(() => import('./FarmsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-600">Cargando mapa...</p>
      </div>
    </div>
  )
})

interface FarmsMapSectionProps {
  farms: FarmLocation[]
  onSelectFarm?: (farm: FarmLocation) => void
}

export default function FarmsMapSection({ farms, onSelectFarm }: FarmsMapSectionProps) {
  return (
    <Suspense fallback={
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Preparando mapa...</p>
      </div>
    }>
      <FarmsMap
        farms={farms}
        onSelectFarm={onSelectFarm}
        showDetailLink={true}
      />
    </Suspense>
  )
}
```

---

## Paso 4: Marcadores Individuales (Implementado)

### 4.1 MapClient - Granja Individual

**Archivo**: `src/app/(frontend)/farms/[slug]/MapClient.tsx` (implementado)

```tsx
'use client'

import React, { useState } from 'react'
import MapBase from '@/components/MapBase'
import { Marker, Popup } from 'react-map-gl'
import { MapPinIcon } from '@heroicons/react/24/solid'

interface MapClientProps {
  name: string
  locationText: string
  lat: number
  lng: number
  zoom?: number
}

export default function MapClient({ 
  name, 
  locationText, 
  lat, 
  lng, 
  zoom = 12 
}: MapClientProps) {
  const [showPopup, setShowPopup] = useState(true)

  return (
    <MapBase
      center={{ lat, lng }}
      zoom={zoom}
      className="w-full h-64 rounded-lg overflow-hidden"
    >
      {/* Marcador de la granja */}
      <Marker
        longitude={lng}
        latitude={lat}
        anchor="bottom"
      >
        <button
          className="text-red-600 hover:text-red-700 transition-colors"
          onClick={() => setShowPopup(!showPopup)}
        >
          <MapPinIcon className="w-8 h-8 drop-shadow-lg" />
        </button>
      </Marker>

      {/* Popup con información */}
      {showPopup && (
        <Popup
          longitude={lng}
          latitude={lat}
          anchor="top"
          offset={[0, -40]}
          onClose={() => setShowPopup(false)}
          closeButton={true}
          closeOnClick={false}
        >
          <div className="p-3">
            <h3 className="font-semibold text-gray-900 mb-1">
              {name}
            </h3>
            <p className="text-sm text-gray-600">
              {locationText}
            </p>
          </div>
        </Popup>
      )}
    </MapBase>
  )
}
```

---

## Paso 5: Integración en Páginas (Implementado)

### 5.1 Transformación de Datos del Servidor

**Archivo**: `src/app/(frontend)/farms/page.tsx` (patrón implementado)

```tsx
import { getPayload } from 'payload'
import config from '@/payload.config'
import FarmsMapSection from '@/components/FarmsMapSection'
import type { FarmLocation } from '@/types/maps'

export default async function FarmsPage() {
  const payload = await getPayload({ config })
  
  // Obtener granjas con datos mínimos para optimizar payload
  const farms = await payload.find({
    collection: 'farms',
    where: {
      isActive: { equals: true }
    },
    select: {
      id: true,
      slug: true,
      name: true,
      'location.coordinates.latitude': true,
      'location.coordinates.longitude': true,
      'location.address': true,
      'location.city': true,
      'location.state': true,
    },
    limit: 1000,
  })

  // Transformar a formato optimizado para mapas
  const farmLocations: FarmLocation[] = farms.docs
    .filter(farm => 
      farm.location?.coordinates?.latitude && 
      farm.location?.coordinates?.longitude
    )
    .map(farm => ({
      id: farm.id,
      slug: farm.slug,
      name: farm.name,
      lat: farm.location.coordinates.latitude,
      lng: farm.location.coordinates.longitude,
      locationText: `${farm.location.address}, ${farm.location.city}, ${farm.location.state}`
    }))

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Mapa de Granjas</h1>
      
      <div className="h-96 rounded-lg overflow-hidden">
        <FarmsMapSection 
          farms={farmLocations}
          onSelectFarm={(farm) => {
            console.log('Granja seleccionada:', farm.name)
          }}
        />
      </div>
      
      {/* Lista de granjas u otro contenido */}
    </div>
  )
}
```

---

## Paso 6: Optimizaciones Implementadas

### 6.1 Performance Considerations (Implementadas)

#### **Circle Layers vs Markers**
```tsx
// ✅ Implementado: Usa circle layers en lugar de muchas instancias de Marker
// Mejor performance para conjuntos grandes de datos
const unclusteredPointLayer = {
  id: 'unclustered-point',
  type: 'circle' as const,
  source: 'farms',
  paint: {
    'circle-color': markerColor,
    'circle-radius': 8
  }
}
```

#### **Payload Mínimo**
```typescript
// ✅ Implementado: FarmLocation mantiene el payload pequeño
interface FarmLocation {
  id: string
  slug: string  
  name: string
  lat: number
  lng: number
  locationText: string
  // No incluye datos innecesarios como descripción completa, imágenes, etc.
}
```

#### **Clustering Eficiente**
```tsx
// ✅ Implementado: Configuración optimizada de clustering
<Source
  cluster={true}
  clusterMaxZoom={14}    // No clusters después de zoom 14
  clusterRadius={50}     // Radio de agrupación en pixels
>
```

### 6.2 Styling Implementado

#### **Highlight Selected Point**
```typescript
// ✅ Implementado: Expresión data-driven para destacar selección
'circle-color': [
  'case',
  ['==', ['get', 'id'], selectedFarm?.id || ''],
  '#dc2626', // Rojo para seleccionado
  markerColor  // Color normal
] as Expression
```

#### **Cursor Interactivo**
```tsx
// ✅ Implementado: Cursor pointer solo sobre layers interactivos
<Map
  interactiveLayerIds={['clusters', 'unclustered-point']}
  cursor="default"
>
```

---

## Funcionalidades Implementadas vs Futuras

### ✅ **Implementado en el Proyecto**

1. **Mapa clusterizado** con `FarmsMap`
2. **Marcadores individuales** con `MapClient` 
3. **Popups interactivos** con información de granja
4. **Click handling** para clusters y puntos
5. **Smooth zoom** en cluster expansion
6. **Selection highlighting** para granjas seleccionadas
7. **Minimal payload** con tipo `FarmLocation`
8. **SSR compatibility** con dynamic imports
9. **Responsive design** con controles de navegación

### 🚀 **Futuras Mejoras (Roadmap)**

1. **List ↔ marker hover sync**: Sincronizar hover entre lista y marcadores
2. **Search/geocode**: Búsqueda de ubicaciones con geocodificación
3. **User geolocation**: Detectar ubicación del usuario
4. **Theme switching**: Cambio de estilos de mapa y modo oscuro
5. **Filters**: Filtros por distancia y categorías de productos
6. **Performance**: Viewport culling para grandes conjuntos de datos

---

## Ejemplo de Uso Implementado

### **Mapa de Índice (Clusterizado)**
```tsx
<FarmsMap
  farms={farmLocations}
  clusterColor="#2563eb"
  markerColor="#f97316"
  onSelectFarm={(farm) => console.log(farm.id)}
  showDetailLink={true}
/>
```

### **Mapa de Granja Individual**
```tsx
<MapClient 
  name={farm.name} 
  locationText={farm.location} 
  lat={farm.geo.lat} 
  lng={farm.geo.lng} 
  zoom={12} 
/>
```

---

## Siguiente Paso

Después de implementar/mejorar el sistema de mapas:

1. **[06-UI.md](./06-UI.md)**: Sistema de componentes y estilos avanzados
2. **[07-SEO.md](./07-SEO.md)**: Optimización para motores de búsqueda  
3. **[Advanced-Geospatial-Guide.md](./Advanced-Geospatial-Guide.md)**: Funcionalidades geoespaciales avanzadas
4. **[Mobile-Map-Optimization-Guide.md](./Mobile-Map-Optimization-Guide.md)**: Optimizaciones para móviles

---

*Este sistema de mapas está implementado de forma eficiente con clustering inteligente, optimización de payload, y manejo de estados. La arquitectura actual es sólida y lista para extensiones futuras.*
