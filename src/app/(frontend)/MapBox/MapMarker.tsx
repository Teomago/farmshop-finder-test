'use client'
// import { Marker } from 'react-map-gl'
import { Marker } from 'react-map-gl/mapbox'
import Pin from './Pin'

type Props = {
  longitude: number
  latitude: number
  onClick?: () => void
}

export default function MapMarker({ longitude, latitude, onClick }: Props) {
  return (
    <Marker longitude={longitude} latitude={latitude}>
      <div onClick={onClick} style={{ lineHeight: 0 }}>
        <Pin />
      </div>
    </Marker>
  )
}
