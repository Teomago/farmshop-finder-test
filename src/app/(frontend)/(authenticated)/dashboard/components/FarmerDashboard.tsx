'use client'
import React, { useState } from 'react'
import type { Farm } from '@/payload-types'
import { FarmForm } from './FarmForm'

interface Props {
  farm: Farm | null
}

export function FarmerDashboard({ farm }: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(farm ? 'view' : 'create')

  if (mode === 'create') {
    return (
      <div className="border rounded p-4">
        <h2 className="text-xl font-semibold mb-4">Crear tu Finca</h2>
        <FarmForm farm={null} />
      </div>
    )
  }

  if (mode === 'edit' && farm) {
    return (
      <div className="border rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Editar Finca</h2>
          <button onClick={() => setMode('view')} className="text-sm underline">
            Cancelar
          </button>
        </div>
        <FarmForm farm={farm} />
      </div>
    )
  }

  return (
    <div className="border rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">Tu Finca</h2>
        <button onClick={() => setMode('edit')} className="text-sm underline">
          Editar
        </button>
      </div>
      {farm ? (
        <div className="space-y-2">
          <p>
            <span className="font-medium">Nombre:</span> {farm.name}
          </p>
          {farm.tagline && (
            <p>
              <span className="font-medium">Lema:</span> {farm.tagline}
            </p>
          )}
          {farm.location && (
            <p>
              <span className="font-medium">Ubicación:</span> {farm.location}
            </p>
          )}
        </div>
      ) : (
        <p>No se encontró la finca.</p>
      )}
    </div>
  )
}
