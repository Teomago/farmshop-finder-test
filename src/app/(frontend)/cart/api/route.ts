'use server'

import { NextResponse } from 'next/server'
import { getAllCarts } from '../actions/cartActions'

export async function GET() {
  try {
    const carts = await getAllCarts()
    return NextResponse.json({ carts })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load carts'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
