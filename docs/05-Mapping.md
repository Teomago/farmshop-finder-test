# Mapbox Integration

Implements interactive maps for farms (clustered index + single-farm view) using `react-map-gl` (Mapbox style API).

## Components
- **MapView (`Map.tsx`)**: Controlled map with navigation + scale controls.
- **MapBase (`MapBase.tsx`)**: Convenience wrapper for single-farm pages (supplies default center/zoom).
- **FarmsMap (`FarmsMap.tsx`)**: Clustered map rendering all farms via a single GeoJSON `Source` and three `Layer`s (clusters, cluster-count, unclustered point). Handles click for cluster expansion & point selection.
- **MapPopup (`MapPopup.tsx`)**: Wrapper around `Popup` component.
- **MapClient (`[slug]/MapClient.tsx`)**: Single farm marker + popup toggle.
- **types.ts**: `FarmLocation` minimal data contract.
- **FarmsMapSection**: Dynamic client wrapper (avoids SSR issues with WebGL).

## Data Passing
Server (`/farms/page.tsx`) transforms Payload farm docs → `FarmLocation[]` (only id, slug, name, lat, lng, locationText) minimizing client payload.

## Cluster Map Flow
1. Build `FeatureCollection` from `FarmLocation[]`.
2. Initial center derived from bounding box midpoint.
3. Fit bounds on mount / farm set change.
4. Click handler uses `queryRenderedFeatures` to detect cluster vs point.
5. Cluster click → `getClusterExpansionZoom` for smooth zoom.
6. Point click → set selected id, popup rendered.
7. Escape key & outside click clear selection.

## Styling
- Selected point highlighted via data-driven expression (larger radius, different color).
- Pointer cursor only over interactive layers.

## Popup
```
<MapPopup longitude={lng} latitude={lat} onClose={...}>
  <div>Title / location / optional link</div>
</MapPopup>
```
Rendered inside same `Map` (not outside wrapper) to avoid overlay issues.

## Example (Index)
```tsx
<FarmsMap
  farms={farmLocations}
  clusterColor="#2563eb"
  markerColor="#f97316"
  onSelectFarm={(farm) => console.log(farm.id)}
  showDetailLink
/>
```

## Example (Single Farm)
```tsx
<MapClient name={farm.name} locationText={farm.location} lat={farm.geo.lat} lng={farm.geo.lng} zoom={12} />
```

## Performance Considerations
- Uses circle layers instead of many `Marker` instances → better for large sets.
- Minimal prop drilling; `FarmLocation` keeps payload small.

## Future Enhancements
- List ↔ marker hover sync.
- Search/geocode & user geolocation.
- Theme switching (map styles) + dark mode adjustments.
- Filters (distance, product categories).

---
Next: `06-UI.md` for UI & styling system.
