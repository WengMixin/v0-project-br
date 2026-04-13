import { NextResponse } from 'next/server'
import { getShippingData } from '@/lib/shipping-data'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const payload = await getShippingData()
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[shipping-data]', e)
    return NextResponse.json(
      {
        success: false,
        errors: [e instanceof Error ? e.message : String(e)],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
