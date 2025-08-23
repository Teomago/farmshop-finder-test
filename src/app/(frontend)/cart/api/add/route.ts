'use server'

import { NextResponse } from 'next/server'
import { addToCart } from '../../actions/cartActions'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { farmId, productId, bundles } = body || {}
    if (!farmId || !productId) {
      return NextResponse.json({ error: 'Missing farmId or productId' }, { status: 400 })
    }
    const cart = await addToCart({ farmId, productId, bundles })
    return NextResponse.json({ cart })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Add to cart failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
