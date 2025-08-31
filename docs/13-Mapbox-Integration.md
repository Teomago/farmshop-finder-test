# Mapbox Integration Deep Dive

This document provides comprehensive documentation of the Mapbox integration, including interactive maps, clustering, popups, and geographic data handling.

## Mapbox Architecture Overview

The application uses **react-map-gl** (Mapbox's React wrapper) to provide interactive maps with the following key features:

```
Map Components Hierarchy:
├── FarmsMap.tsx (clustered view of all farms)
├── MapClient.tsx (single farm marker + popup)
├── MapBase.tsx (reusable map wrapper)
├── MapMarker.tsx (custom pin component)
├── MapPopup.tsx (info popup wrapper)
└── Pin.tsx (SVG marker icon)
```

### Core Types (`types.ts`)

```typescript
export interface FarmLocation {
  id: string        // Farm document ID
  slug: string      // URL-friendly identifier
  name: string      // Display name
  lat: number       // Latitude coordinate
  lng: number       // Longitude coordinate
  locationText?: string // Human-readable address
}
```

**Design Philosophy:**
- Minimal data transfer (only essential fields for map display)
- Type-safe coordinates (numbers, not strings)
- Optional location text for enhanced UX

## Clustered Farms Map (`FarmsMap.tsx`)

### Component Architecture

```typescript
interface FarmsMapProps {
  farms: FarmLocation[]
  initialZoom?: number
  fallbackZoom?: number
  showDetailLink?: boolean
  clusterColor?: string
  clusterTextColor?: string
  markerColor?: string
  onSelectFarm?: (farm: FarmLocation) => void
}

export function FarmsMap({
  farms,
  initialZoom = 4,
  fallbackZoom = 2,
  showDetailLink = true,
  clusterColor = '#2563eb',
  markerColor = '#f97316',
  onSelectFarm,
}: FarmsMapProps) {
  // Implementation details below...
}
```

### GeoJSON Generation

The component transforms farm data into GeoJSON format for Mapbox consumption:

```typescript
// Generate GeoJSON FeatureCollection from farms
const geojsonData = useMemo((): GeoJSON.FeatureCollection => {
  const validFarms = farms.filter(f => 
    typeof f.lat === 'number' && typeof f.lng === 'number'
  )
  
  return {
    type: 'FeatureCollection',
    features: validFarms.map(farm => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [farm.lng, farm.lat], // Note: lng first!
      },
      properties: {
        id: farm.id,
        slug: farm.slug,
        name: farm.name,
        locationText: farm.locationText || '',
      },
    })),
  }
}, [farms])
```

**Important Note:** GeoJSON coordinates are `[longitude, latitude]` (opposite of typical lat/lng order).

### Intelligent Map Bounds

The map automatically calculates optimal center and zoom based on farm locations:

```typescript
// Calculate bounding box from all farms
let initialCenter = { longitude: 0, latitude: 20 } // Default
if (validFarms.length > 0) {
  let minLng = Infinity, minLat = Infinity
  let maxLng = -Infinity, maxLat = -Infinity
  
  for (const farm of validFarms) {
    if (farm.lng < minLng) minLng = farm.lng
    if (farm.lng > maxLng) maxLng = farm.lng
    if (farm.lat < minLat) minLat = farm.lat
    if (farm.lat > maxLat) maxLat = farm.lat
  }
  
  // Use midpoint as center
  initialCenter = {
    longitude: (minLng + maxLng) / 2,
    latitude: (minLat + maxLat) / 2,
  }
}

// Fit bounds on mount
useEffect(() => {
  if (mapRef.current && validFarms.length > 1) {
    const coordinates = validFarms.map(f => [f.lng, f.lat])
    
    mapRef.current.fitBounds([
      [minLng, minLat],
      [maxLng, maxLat]
    ], {
      padding: 50,
      maxZoom: 12,
    })
  }
}, [validFarms])
```

### Three-Layer Clustering System

The map uses three distinct layers for optimal performance and UX:

#### 1. Cluster Circles Layer
```typescript
const clusterLayer: CircleLayer = {
  id: 'clusters',
  type: 'circle',
  source: 'farms',
  filter: ['has', 'point_count'], // Only cluster points
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      clusterColor,    // Default color
      5, '#f97316',    // 5+ farms: orange
      10, '#ef4444',   // 10+ farms: red
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20,   // Default radius
      5, 25,   // 5+ farms: larger
      10, 30,  // 10+ farms: largest
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
  },
}
```

#### 2. Cluster Count Labels Layer
```typescript
const clusterCountLayer: SymbolLayer = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'farms',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12,
  },
  paint: {
    'text-color': clusterTextColor,
  },
}
```

#### 3. Individual Point Layer
```typescript
const unclusteredPointLayer: CircleLayer = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'farms',
  filter: ['!', ['has', 'point_count']], // Only non-cluster points
  paint: {
    'circle-color': [
      'case',
      ['==', ['get', 'id'], selectedId || ''], // Highlight selected
      '#059669', // Green for selected
      markerColor, // Default color
    ],
    'circle-radius': [
      'case',
      ['==', ['get', 'id'], selectedId || ''],
      12, // Larger when selected
      8,  // Default size
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
  },
}
```

### Interactive Click Handling

```typescript
const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
  if (!mapRef.current) return
  
  // Query features at click point
  const features = mapRef.current.queryRenderedFeatures(event.point, {
    layers: ['clusters', 'unclustered-point'],
  })
  
  const feature = features[0]
  if (!feature) {
    // Clicked on empty area - clear selection
    setSelectedId(null)
    return
  }
  
  if (feature.layer.id === 'clusters') {
    // Cluster clicked - zoom to expand
    const clusterId = feature.properties.cluster_id
    const source = mapRef.current.getSource('farms') as GeoJSONSource
    
    source.getClusterExpansionZoom(clusterId).then((zoom) => {
      mapRef.current?.easeTo({
        center: feature.geometry.coordinates as [number, number],
        zoom: zoom,
        duration: 500,
      })
    })
  } else if (feature.layer.id === 'unclustered-point') {
    // Individual farm clicked - show popup
    const farmId = feature.properties.id
    setSelectedId(farmId)
    
    // Optional callback
    const farm = validFarms.find(f => f.id === farmId)
    if (farm && onSelectFarm) {
      onSelectFarm(farm)
    }
  }
}, [validFarms, onSelectFarm])
```

### Popup Integration

```typescript
{selectedFarm && (
  <MapPopup
    longitude={selectedFarm.lng}
    latitude={selectedFarm.lat}
    onClose={() => setSelectedId(null)}
  >
    <div className="text-xs leading-snug space-y-1 max-w-[260px]">
      <p className="font-semibold text-neutral-800 m-0">
        {selectedFarm.name}
      </p>
      
      {selectedFarm.locationText && (
        <p className="m-0 text-neutral-600">
          {selectedFarm.locationText}
        </p>
      )}
      
      {showDetailLink && (
        <Link 
          href={`/farms/${selectedFarm.slug}`}
          className="text-blue-600 hover:text-blue-800 text-xs"
        >
          View Details →
        </Link>
      )}
    </div>
  </MapPopup>
)}
```

### Keyboard Navigation

```typescript
// ESC key to clear selection
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedId(null)
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [])
```

## Single Farm Map (`MapClient.tsx`)

### Simple Marker Implementation

```typescript
interface MapClientProps {
  lat?: number
  lng?: number
  zoom?: number
  name?: string
  locationText?: string
}

export function MapClient({ 
  name, 
  locationText, 
  lat, 
  lng, 
  zoom = 12 
}: MapClientProps) {
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
            <MapPopup 
              longitude={lng!} 
              latitude={lat!} 
              onClose={() => setOpen(false)}
            >
              <div className="text-xs leading-snug space-y-1 max-w-[260px]">
                {name && (
                  <p className="font-semibold text-neutral-800 m-0">
                    {name}
                  </p>
                )}
                {locationText && (
                  <p className="m-0 text-neutral-600">
                    {locationText}
                  </p>
                )}
              </div>
            </MapPopup>
          )}
        </>
      )}
    </MapBase>
  )
}
```

**Key Features:**
- **Graceful Degradation**: Handles missing coordinates
- **Simple Interaction**: Click marker to show popup
- **Reusable Base**: Uses MapBase wrapper for consistency

## Base Map Component (`MapBase.tsx`)

### Wrapper with Defaults

```typescript
interface MapBaseProps {
  lat?: number
  lng?: number
  zoom?: number
  children?: ReactNode
}

export function MapBase({ 
  lat = 0, 
  lng = 0, 
  zoom = 4, 
  children 
}: MapBaseProps) {
  return (
    <Map
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      mapStyle="mapbox://styles/mapbox/light-v11"
      initialViewState={{
        longitude: lng,
        latitude: lat,
        zoom: zoom,
      }}
      style={{ width: '100%', height: '400px' }}
      maxZoom={20}
      minZoom={1}
    >
      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-left" />
      {children}
    </Map>
  )
}
```

**Standardized Features:**
- Consistent map style (light theme)
- Standard controls (navigation + scale)
- Responsive sizing
- Zoom limits

## Custom Marker Component (`MapMarker.tsx`)

### SVG-Based Pin

```typescript
import { Marker } from 'react-map-gl/mapbox'
import Pin from './Pin'

type Props = {
  longitude: number
  latitude: number
  onClick?: () => void
}

export default function MapMarker({ 
  longitude, 
  latitude, 
  onClick 
}: Props) {
  return (
    <Marker longitude={longitude} latitude={latitude}>
      <div onClick={onClick} style={{ lineHeight: 0 }}>
        <Pin />
      </div>
    </Marker>
  )
}
```

### Custom Pin SVG (`Pin.tsx`)

```typescript
export default function Pin() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ cursor: 'pointer' }}
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="#f97316"
        stroke="#fff"
        strokeWidth="2"
      />
      <circle cx="12" cy="9" r="3" fill="#fff" />
    </svg>
  )
}
```

**Design Features:**
- **Orange color scheme**: Matches brand
- **White stroke**: Visibility on any background
- **Cursor pointer**: Clear interactivity
- **Centered dot**: Pin point precision

## Data Transformation Pipeline

### Server to Client Flow

```typescript
// 1. Server Component (farms/page.tsx)
export default async function FarmsPage() {
  const payload = await getPayload({ config })
  
  const { docs: farms } = await payload.find({
    collection: 'farms',
    depth: 1,
  })
  
  // 2. Transform to minimal location data
  const farmLocations: FarmLocation[] = farms
    .filter(farm => farm.geo?.lat && farm.geo?.lng)
    .map(farm => ({
      id: farm.id,
      slug: farm.slug,
      name: farm.name,
      lat: farm.geo.lat,
      lng: farm.geo.lng,
      locationText: farm.location,
    }))
  
  // 3. Pass to client component
  return (
    <div>
      <FarmsMapSection farms={farmLocations} />
    </div>
  )
}

// 4. Client Component Wrapper (avoids SSR issues)
'use client'
function FarmsMapSection({ farms }: { farms: FarmLocation[] }) {
  return (
    <div className="map-container">
      <FarmsMap
        farms={farms}
        showDetailLink={true}
        clusterColor="#2563eb"
        markerColor="#f97316"
      />
    </div>
  )
}
```

## Performance Optimizations

### Data Minimization

```typescript
// ❌ Don't send full farm objects to client
const badData = farms.map(farm => farm) // Includes description, products, etc.

// ✅ Send only essential map data
const goodData: FarmLocation[] = farms.map(farm => ({
  id: farm.id,
  slug: farm.slug,
  name: farm.name,
  lat: farm.geo.lat,
  lng: farm.geo.lng,
  locationText: farm.location, // Optional display text
}))
```

### Layer-Based Rendering

```typescript
// Using circle layers instead of individual markers
// Better performance for 100+ farms
const source = (
  <Source id="farms" type="geojson" data={geojsonData} cluster={true}>
    <Layer {...clusterLayer} />
    <Layer {...clusterCountLayer} />
    <Layer {...unclusteredPointLayer} />
  </Source>
)
```

### Memoized Calculations

```typescript
// Expensive GeoJSON transformation only runs when farms change
const geojsonData = useMemo((): GeoJSON.FeatureCollection => {
  return transformFarmsToGeoJSON(farms)
}, [farms])

// Bounds calculation cached
const bounds = useMemo(() => {
  return calculateBounds(validFarms)
}, [validFarms])
```

## Environment Configuration

### Mapbox Token Setup

```bash
# .env.local
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ciIsImEiOiJ1cHB1In0...
```

**Security Note:** This must be a public token (starts with `pk.`) since it's used in client-side code.

### Map Styles

Currently using `mapbox://styles/mapbox/light-v11`, but can be customized:

```typescript
// Alternative map styles
const mapStyles = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
}
```

## Future Enhancements

### 1. Search Integration
```typescript
// Geocoding search box
export function MapSearch({ onLocationSelect }: MapSearchProps) {
  return (
    <input
      placeholder="Search for location..."
      onChange={handleSearch}
    />
  )
}
```

### 2. User Geolocation
```typescript
// Find farms near user
export function useUserLocation() {
  const [location, setLocation] = useState<[number, number] | null>(null)
  
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation([position.coords.longitude, position.coords.latitude])
      },
      (error) => console.warn('Geolocation error:', error)
    )
  }, [])
  
  return location
}
```

### 3. Distance Filtering
```typescript
// Filter farms within radius
export function filterFarmsByDistance(
  farms: FarmLocation[],
  center: [number, number],
  radiusKm: number
): FarmLocation[] {
  return farms.filter(farm => {
    const distance = calculateDistance(center, [farm.lng, farm.lat])
    return distance <= radiusKm
  })
}
```

### 4. Theme Integration
```typescript
// Map style based on app theme
export function useMapStyle() {
  const { theme } = useTheme()
  return theme === 'dark' 
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11'
}
```

---
Next: `14-Styling-System.md` for comprehensive UI, theming, and component styling documentation.