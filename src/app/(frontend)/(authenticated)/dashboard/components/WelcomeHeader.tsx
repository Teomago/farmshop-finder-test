'use client'

import React from 'react'

export const WelcomeHeader = ({ name }: { name: string }) => {
  return (
    <div className="w-full flex justify-center items-center mb-6">
      <h2 className="text-2xl font-semibold text-[var(--barn)]">Welcome back, {name}</h2>
    </div>
  )
}
