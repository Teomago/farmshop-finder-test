'use server'

import { NextResponse } from 'next/server'
import { clearAllCarts } from '../../../cart/actions/cartActions'

export async function POST() {
  try {
    const result = await clearAllCarts()
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Clear failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
