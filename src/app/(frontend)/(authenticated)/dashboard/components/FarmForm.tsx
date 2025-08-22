'use client'
import React, { useState, useEffect, FormEvent } from 'react'
import type { Farm, Product } from '@/payload-types'
import { createFarm, updateFarm } from '../actions/farmActions'
import { Card } from '@heroui/card'
import { Form } from '@heroui/form'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Select, SelectItem } from '@heroui/select'
// HeroUI no textarea oficial -> usar <textarea> estilizada o Input multiline si se añade; mantenemos textarea

type ProductEntry = {
  product: string
  quantity: number
  unit: 'kg' | 'pcs' | 'liters' | 'boxes'
  price: number
  _key?: string
}

interface Props {
  farm?: Farm | null
  onDone?: () => void
}

export function FarmForm({ farm, onDone }: Props) {
  const [name, setName] = useState(farm?.name || '')
  const [tagline, setTagline] = useState(farm?.tagline || '')
  const [location, setLocation] = useState(farm?.location || '')
  const [description, setDescription] = useState<string>('')
  const [products, setProducts] = useState<ProductEntry[]>(
    farm?.products?.map((p) => ({
      product: typeof p.product === 'string' ? p.product : p.product.id,
      quantity: p.quantity,
      unit: p.unit,
      price: p.price,
    })) || [],
  )
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageAlt, setImageAlt] = useState('')
  const [remoteImageUrl, setRemoteImageUrl] = useState('')
  const [remoteImageName, setRemoteImageName] = useState('')
  const [existingImageUrl] = useState<string | null>(
    typeof farm?.farmImage === 'object' ? farm.farmImage.url || null : null,
  )
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products?limit=100')
        if (res.ok) {
          const data = await res.json()
          setAllProducts(data?.docs || [])
        }
      } catch (_err) {
        // ignore
      }
    }
    fetchProducts()
  }, [])

  function toLexical(text: string) {
    return {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            version: 1,
            format: '',
            indent: 0,
            direction: null,
            children: [
              {
                type: 'text',
                text,
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                version: 1,
              },
            ],
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }
  }

  function generateAlt(fallbackName: string) {
    if (imageAlt.trim()) return imageAlt.trim()
    const base = fallbackName.replace(/[-_]/g, ' ').replace(/\.[a-zA-Z0-9]+$/, '')
    return base.charAt(0).toUpperCase() + base.slice(1)
  }

  async function uploadMedia(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('alt', generateAlt(file.name))
    const res = await fetch('/api/media', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Image upload failed')
    const json = await res.json()
    return json?.doc?.id
  }

  async function uploadRemoteImage(url: string, nameOverride?: string): Promise<string> {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Couldn't download remote image")
    const blob = await res.blob()
    const inferredName = nameOverride?.trim() || url.split('/').pop() || 'image.jpg'
    const file = new File([blob], inferredName, { type: blob.type || 'image/jpeg' })
    return uploadMedia(file)
  }

  function addProductRow() {
    setProducts((p) => [
      ...p,
      { product: '', quantity: 0, unit: 'kg', price: 0, _key: crypto.randomUUID() },
    ])
  }

  function updateProductRow(index: number, patch: Partial<ProductEntry>) {
    setProducts((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function removeProductRow(index: number) {
    setProducts((rows) => rows.filter((_, i) => i !== index))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setStatus(null)
    try {
      let farmImageId: string | undefined
      if (imageFile) {
        farmImageId = await uploadMedia(imageFile)
      } else if (remoteImageUrl) {
        farmImageId = await uploadRemoteImage(remoteImageUrl, remoteImageName)
      } else if (typeof farm?.farmImage === 'string') {
        farmImageId = farm.farmImage
      } else if (farm && typeof farm.farmImage === 'object') {
        farmImageId = farm.farmImage.id
      }
      if (!farm && !farmImageId) {
        throw new Error('Debe subir una imagen para la granja')
      }
      const descriptionValue = description
        ? (toLexical(description) as Farm['description'])
        : undefined
      const productEntries = products.filter((p) => p.product)
      if (farm) {
        await updateFarm(farm.id, {
          name,
          tagline,
          location,
          farmImage: farmImageId,
          description: descriptionValue,
          products: productEntries,
        })
        setStatus('updated')
      } else {
        await createFarm({
          name,
          tagline,
          location,
          farmImage: farmImageId,
          description: descriptionValue,
          products: productEntries,
        })
        setStatus('created')
      }
      onDone?.()
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form
      onSubmit={onSubmit}
      className="farmForm flex flex-col gap-6 text-[var(--carrot)] p-6 rounded-lg border shadow-lg"
      validationBehavior="native"
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div>
          <Input
            name="name"
            label="Nombre"
            labelPlacement="outside"
            isRequired
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la finca"
            color={'warning'}
          />
          <Input
            name="tagline"
            label="Lema"
            labelPlacement="outside"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Un lema opcional"
            color="warning"
          />
          <Input
            name="location"
            label="Ubicación"
            labelPlacement="outside"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ciudad / Región"
            color="warning"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              className="w-full border rounded px-3 py-2 min-h-[120px] bg-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu finca..."
            />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Imagen (subir o URL)</label>
            {existingImageUrl && !imageFile && (
              <Card className="mb-2 w-full max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={existingImageUrl} alt="Farm" className="w-full h-40 object-cover" />
              </Card>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            <Input
              label="Alt de la imagen"
              labelPlacement="outside"
              placeholder="Texto alternativo descriptivo"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              color="warning"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="URL Remota"
                labelPlacement="outside"
                placeholder="https://..."
                value={remoteImageUrl}
                onChange={(e) => setRemoteImageUrl(e.target.value)}
                color="warning"
              />
              <Input
                label="Nombre Imagen"
                labelPlacement="outside"
                placeholder="Opcional"
                value={remoteImageName}
                onChange={(e) => setRemoteImageName(e.target.value)}
                color="warning"
              />
            </div>
            {remoteImageUrl && (
              <p className="text-xs text-gray-500">Se descargará y subirá la imagen remota.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 md:-mt-2">
            <label className="text-sm font-medium">Productos</label>
            <Button size="sm" variant="flat" type="button" onPress={addProductRow}>
              Añadir
            </Button>
          </div>
          {products.length === 0 && (
            <p className="text-xs text-[var(--carrot)]! md:w-[461.217px]">No products</p>
          )}
          {products.map((row, i) => (
            <div key={row._key || i} className="rounded border p-3 flex flex-col gap-3 bg-white/50">
              {/* Línea 1: selector de producto */}
              <Select
                label="Producto"
                labelPlacement="outside"
                selectedKeys={row.product ? [row.product] : []}
                onSelectionChange={(keys) => {
                  const first = Array.from(keys)[0] as string | undefined
                  updateProductRow(i, { product: first || '' })
                }}
                color="warning"
              >
                {allProducts.map((p) => (
                  <SelectItem key={p.id} textValue={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </Select>

              {/* Línea 2: cantidad, unidad, precio */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="number"
                  label="Cant."
                  labelPlacement="outside"
                  value={String(row.quantity)}
                  min={0}
                  onChange={(e) => updateProductRow(i, { quantity: Number(e.target.value) })}
                  className="flex-1"
                  color="warning"
                />
                <Select
                  label="Unidad"
                  labelPlacement="outside"
                  selectedKeys={[row.unit]}
                  onSelectionChange={(keys) => {
                    const first = Array.from(keys)[0] as ProductEntry['unit']
                    updateProductRow(i, { unit: first })
                  }}
                  className="flex-1"
                  color="warning"
                >
                  <SelectItem color="warning" key="kg" textValue="kg">
                    kg
                  </SelectItem>
                  <SelectItem color="warning" key="pcs" textValue="pcs">
                    pcs
                  </SelectItem>
                  <SelectItem color="warning" key="liters" textValue="liters">
                    liters
                  </SelectItem>
                  <SelectItem color="warning" key="boxes" textValue="boxes">
                    boxes
                  </SelectItem>
                </Select>
                <Input
                  type="number"
                  label="Precio"
                  labelPlacement="outside"
                  value={String(row.price)}
                  min={0}
                  onChange={(e) => updateProductRow(i, { price: Number(e.target.value) })}
                  className="flex-1"
                  color="warning"
                />
              </div>

              {/* Línea 3: eliminar */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  type="button"
                  onPress={() => removeProductRow(i)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <Button
          color="primary"
          type="submit"
          isDisabled={submitting}
          className="bg-[var(--carrot)]/85"
        >
          {submitting ? 'Guardando...' : farm ? 'Actualizar Finca' : 'Crear Finca'}
        </Button>
        {status && <p className="text-sm">Estado: {status}</p>}
      </div>
    </Form>
  )
}
