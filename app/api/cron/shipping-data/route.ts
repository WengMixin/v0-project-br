import { NextResponse } from 'next/server'
import { getShippingData } from '@/lib/shipping-data'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Same payload as GET /api/shipping-data — for Vercel Cron or external schedulers.
 * Optional: set CRON_SECRET and pass ?secret=... to reduce abuse.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const { searchParams } = new URL(request.url)
    if (searchParams.get('secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const payload = await getShippingData()
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[cron/shipping-data]', e)
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
