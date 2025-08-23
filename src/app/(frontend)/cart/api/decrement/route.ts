'use server'

import { NextResponse } from 'next/server'
import { decrementCartItem } from '../../../cart/actions/cartActions'

export async function POST(req: Request) {
  try {
    const { cartId, productId, amount } = await req.json()
    if (!cartId || !productId)
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    const cart = await decrementCartItem({ cartId, productId, amount })
    return NextResponse.json({ cart })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Decrement failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
