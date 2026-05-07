import { NextResponse } from 'next/server'
import { fetchFredLatestPair } from '@/lib/fred-latest'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const FRED_MACRO_SERIES: Record<string, { label: string; unit: string; scale?: 'billions' | 'percent' | 'points' }> = {
  WALCL: { label: '美联储总资产', unit: '百万美元', scale: 'billions' },
  WRESBAL: { label: '存款机构准备金', unit: '百万美元', scale: 'billions' },
  RRPONTSYD: { label: '隔夜逆回购 ON RRP', unit: '十亿美元', scale: 'billions' },
  WTREGEN: { label: 'TGA 财政部一般账户', unit: '百万美元', scale: 'billions' },
  UNRATE: { label: '失业率', unit: '%', scale: 'percent' },
  DGS10: { label: '10年期美债收益率', unit: '%', scale: 'percent' },
}

function formatDtsMillions(n: string | null | undefined): string | null {
  if (n == null || n === 'null') return null
  const v = parseFloat(n)
  if (!Number.isFinite(v)) return null
  // DTS fields are in millions of USD
  const billions = v / 1000
  return `$${billions.toFixed(2)}B`
}

interface TreasuryDtsRow {
  record_date: string
  account_type: string
  open_today_bal?: string | null
}

async function fetchTreasuryTgaClosing(): Promise<{
  recordDate: string
  label: string
  balanceDisplay: string | null
  rawMillions: number | null
} | null> {
  try {
    const url =
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/operating_cash_balance?sort=-record_date&page%5Bsize%5D=40'
    const response = await fetch(url, { next: { revalidate: 3600 } })
    if (!response.ok) return null
    const json = (await response.json()) as { data?: TreasuryDtsRow[] }
    const rows = json.data || []
    const hit = rows.find((r) => r.account_type?.includes('TGA) Closing Balance'))
    if (!hit?.open_today_bal) return null
    const raw = parseFloat(hit.open_today_bal)
    return {
      recordDate: hit.record_date,
      label: 'TGA 收盘（财政部 DTS）',
      balanceDisplay: formatDtsMillions(hit.open_today_bal),
      rawMillions: Number.isFinite(raw) ? raw : null,
    }
  } catch (e) {
    console.error('[macro-indicators] treasury DTS', e)
    return null
  }
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'FRED_API_KEY not configured',
        series: {},
        treasury: null,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  const entries = await Promise.all(
    Object.keys(FRED_MACRO_SERIES).map(async (id) => {
      const pair = await fetchFredLatestPair(id, apiKey, 6)
      return [id, pair] as const
    })
  )

  const series: Record<
    string,
    {
      label: string
      unit: string
      scale?: string
      value: number | null
      previousValue: number | null
      change: number | null
      changePercent: number | null
      date: string | null
      error?: string
    }
  > = {}

  for (const [id, pair] of entries) {
    const meta = FRED_MACRO_SERIES[id]
    if (!pair) {
      series[id] = {
        label: meta.label,
        unit: meta.unit,
        scale: meta.scale,
        value: null,
        previousValue: null,
        change: null,
        changePercent: null,
        date: null,
        error: 'no data',
      }
      continue
    }
    series[id] = {
      label: meta.label,
      unit: meta.unit,
      scale: meta.scale,
      value: pair.value,
      previousValue: pair.previousValue,
      change: pair.change,
      changePercent: pair.changePercent,
      date: pair.date,
    }
  }

  const treasury = await fetchTreasuryTgaClosing()

  return NextResponse.json({
    success: true,
    series,
    treasury,
    timestamp: new Date().toISOString(),
  })
}
