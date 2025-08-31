'use client'
// import { Popup } from 'react-map-gl'
import { Popup } from 'react-map-gl/mapbox'

type Props = {
  longitude: number
  latitude: number
  onClose: () => void
  children: React.ReactNode
}

export default function MapPopup({ longitude, latitude, onClose, children }: Props) {
  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      onClose={onClose}
      closeOnClick={false}
      anchor="bottom"
    >
      {children}
    </Popup>
  )
}
