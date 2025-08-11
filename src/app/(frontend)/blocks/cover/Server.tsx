import React from 'react'

export default function CoverBlockServer({ title, subtitle }) {
  return (
    <div className="max-w-5xl">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}
