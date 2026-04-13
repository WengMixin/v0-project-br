/**
 * BDTI + Brent spot (FRED) vs futures (Yahoo BZ=F) for tanker / physical crude monitoring.
 * BDTI: Trading Economics API (recommended), optional HTML table parse, or BDTI_MANUAL_VALUE.
 */

import * as cheerio from 'cheerio'

export const BRENT_SPOT_FRED_SERIES = 'DCOILBRENTEU'
export const BRENT_FUTURES_YAHOO_SYMBOL = 'BZ=F'

const TE_BDTI_URL = 'https://tradingeconomics.com/commodity/bdti'

export interface FredObservationPoint {
  date: string
  value: number
}

export interface BdtiSnapshot {
  value: number | null
  previousClose: number | null
  dailyChange: number | null
  dailyChangePercent: number | null
  lastDate: string | null
  source: 'tradingeconomics_api' | 'tradingeconomics_html' | 'manual_env' | 'none'
  /** Recent daily closes oldest → newest (FRED BDTI series when configured) */
  history: FredObservationPoint[]
}

export interface BrentSpreadSnapshot {
  spotUsd: number | null
  futuresUsd: number | null
  /** spot − futures; positive ⇒ backwardation (spot premium) */
  spreadUsd: number | null
  isBackwardation: boolean | null
  spotDate: string | null
  futuresAsOf: string | null
  yahooOk: boolean
}

export interface ShippingAlerts {
  /** Two consecutive trading days each down > threshold (needs FRED BDTI history) */
  bdtiTwoDayCrash: boolean
  bdtiCrashThresholdPercent: number
  /** Daily % change ≤ -3% */
  bdtiTodayWeak: boolean
  /** Spot minus futures in a “tight” band (physical premium faded vs strong backwardation) */
  spreadTightUsd: boolean
  /** Heuristic risk-off hint for tankers (strict composite) */
  hecnTakeProfitHint: boolean
}

export interface ShippingDataPayload {
  success: boolean
  bdti: BdtiSnapshot
  brent: BrentSpreadSnapshot
  alerts: ShippingAlerts
  timestamp: string
  errors: string[]
}

interface YahooQuoteResult {
  regularMarketPrice?: number
  regularMarketTime?: number
  symbol?: string
}

interface YahooFinanceResponse {
  quoteResponse?: { result?: YahooQuoteResult[] }
}

async function fetchYahooQuotes(symbols: string[]): Promise<YahooFinanceResponse | null> {
  const symbolsStr = symbols.join(',')
  const endpoints = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolsStr)}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolsStr)}`,
  ]
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        next: { revalidate: 120 },
      })
      if (response.ok) return (await response.json()) as YahooFinanceResponse
    } catch {
      continue
    }
  }
  return null
}

/** Last `limit` observations, chronological (oldest → newest). */
async function fetchFredObservationsRecentAsc(
  seriesId: string,
  apiKey: string,
  limit: number
): Promise<FredObservationPoint[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`
  const response = await fetch(url, { next: { revalidate: 3600 } })
  if (!response.ok) throw new Error(`FRED ${response.status}`)
  const data = (await response.json()) as { observations?: { date: string; value: string }[] }
  const obs = (data.observations ?? [])
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
  return obs.slice().reverse()
}

/** Parse TE sidebar / widget table row for BDTI (best-effort; page layout may change). */
export function parseTeBdtiHtmlWithCheerio(html: string): {
  value: number | null
  previousClose: number | null
  dailyChangePercent: number | null
} {
  const $ = cheerio.load(html)

  let row = $('a[href="/commodity/bdti"]').first().closest('tr')
  if (!row.length) {
    row = $('a[href*="/commodity/bdti"]').first().closest('tr')
  }
  if (!row.length) {
    $('tr[data-symbol]').each((_, el) => {
      const sym = ($(el).attr('data-symbol') || '').toUpperCase()
      if (sym.includes('BDTI') && !row.length) {
        row = $(el)
      }
    })
  }

  if (!row.length) {
    return { value: null, previousClose: null, dailyChangePercent: null }
  }

  const priceText = row.find('td.market-widget-last').first().text().replace(/,/g, '').trim()
  const pctText = row.find('td.market-widget-pct').first().text().replace(/%/g, '').replace(/,/g, '').trim()

  const value = parseFloat(priceText)
  const dailyChangePercent = parseFloat(pctText)

  const chCell = row.find('td#nch').first()
  const dailyAbs = parseFloat(chCell.text().replace(/,/g, '').trim())
  let previousClose: number | null = null
  if (Number.isFinite(value) && Number.isFinite(dailyAbs)) {
    const sign = chCell.find('.market-negative-image').length ? -1 : 1
    const ch = sign * Math.abs(dailyAbs)
    previousClose = value - ch
  }

  return {
    value: Number.isFinite(value) ? value : null,
    previousClose: Number.isFinite(previousClose) ? previousClose : null,
    dailyChangePercent: Number.isFinite(dailyChangePercent) ? dailyChangePercent : null,
  }
}

interface TeCommodityRow {
  Symbol?: string
  URL?: string
  Last?: number
  yesterday?: number
  DailyPercentualChange?: number
  CloseDate?: string
  Date?: string
}

async function fetchBdtiFromTradingEconomicsApi(apiKey: string): Promise<BdtiSnapshot | null> {
  const url = `https://api.tradingeconomics.com/markets/commodities?c=${encodeURIComponent(apiKey)}&f=json`
  const response = await fetch(url, { next: { revalidate: 900 } })
  if (!response.ok) return null
  const rows = (await response.json()) as TeCommodityRow[]
  if (!Array.isArray(rows)) return null
  const hit = rows.find(
    (r) =>
      (r.URL && r.URL.toLowerCase().includes('bdti')) ||
      (r.Symbol && r.Symbol.toUpperCase().includes('BDTI'))
  )
  if (!hit || typeof hit.Last !== 'number') return null
  const prev = typeof hit.yesterday === 'number' ? hit.yesterday : null
  const pct =
    typeof hit.DailyPercentualChange === 'number'
      ? hit.DailyPercentualChange
      : prev && prev !== 0
        ? ((hit.Last - prev) / prev) * 100
        : null
  const lastDate = hit.CloseDate || hit.Date || null
  return {
    value: hit.Last,
    previousClose: prev,
    dailyChange: prev !== null ? hit.Last - prev : null,
    dailyChangePercent: pct,
    lastDate,
    source: 'tradingeconomics_api',
    history: [],
  }
}

async function fetchBdtiFromTradingEconomicsHtml(): Promise<BdtiSnapshot | null> {
  try {
    const response = await fetch(TE_BDTI_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 1800 },
    })
    if (!response.ok) return null
    const html = await response.text()
    const parsed = parseTeBdtiHtmlWithCheerio(html)
    if (parsed.value === null) return null
    return {
      value: parsed.value,
      previousClose: parsed.previousClose,
      dailyChange:
        parsed.previousClose !== null ? parsed.value - parsed.previousClose : null,
      dailyChangePercent: parsed.dailyChangePercent,
      lastDate: null,
      source: 'tradingeconomics_html',
      history: [],
    }
  } catch {
    return null
  }
}

function bdtiFromManualEnv(): BdtiSnapshot | null {
  const raw = process.env.BDTI_MANUAL_VALUE
  if (!raw) return null
  const value = parseFloat(raw)
  if (!Number.isFinite(value)) return null
  return {
    value,
    previousClose: null,
    dailyChange: null,
    dailyChangePercent: null,
    lastDate: null,
    source: 'manual_env',
    history: [],
  }
}

function trimHistory(points: FredObservationPoint[], max = 30): FredObservationPoint[] {
  if (points.length <= max) return [...points]
  return points.slice(-max)
}

function detectBdtiTwoDayCrash(history: FredObservationPoint[], thresholdPct = 5): boolean {
  if (history.length < 3) return false
  const h = history
  const n = h.length
  const r1 = ((h[n - 2].value - h[n - 3].value) / h[n - 3].value) * 100
  const r2 = ((h[n - 1].value - h[n - 2].value) / h[n - 2].value) * 100
  if (!Number.isFinite(r1) || !Number.isFinite(r2)) return false
  return r1 <= -thresholdPct && r2 <= -thresholdPct
}

export async function getShippingData(): Promise<ShippingDataPayload> {
  const errors: string[] = []
  const timestamp = new Date().toISOString()
  let bdti: BdtiSnapshot = {
    value: null,
    previousClose: null,
    dailyChange: null,
    dailyChangePercent: null,
    lastDate: null,
    source: 'none',
    history: [],
  }

  const teKey = process.env.TRADINGECONOMICS_API_KEY
  if (teKey) {
    try {
      const apiSnap = await fetchBdtiFromTradingEconomicsApi(teKey)
      if (apiSnap) bdti = apiSnap
    } catch (e) {
      errors.push(`Trading Economics API: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (bdti.source === 'none') {
    const manual = bdtiFromManualEnv()
    if (manual) bdti = manual
  }

  if (bdti.source === 'none') {
    const htmlSnap = await fetchBdtiFromTradingEconomicsHtml()
    if (htmlSnap) bdti = htmlSnap
  }

  if (bdti.source === 'none') {
    errors.push(
      'BDTI unavailable: set TRADINGECONOMICS_API_KEY, or BDTI_MANUAL_VALUE, or rely on HTML parse if TE layout matches'
    )
  }

  const fredKey = process.env.FRED_API_KEY
  let spotPoints: FredObservationPoint[] = []

  if (fredKey) {
    try {
      spotPoints = await fetchFredObservationsRecentAsc(BRENT_SPOT_FRED_SERIES, fredKey, 45)
    } catch (e) {
      errors.push(`FRED Brent spot: ${e instanceof Error ? e.message : String(e)}`)
    }

    const bdtiFredSeries = process.env.BDTI_FRED_SERIES?.trim()
    if (bdtiFredSeries && bdti.history.length === 0) {
      try {
        const bPoints = await fetchFredObservationsRecentAsc(bdtiFredSeries, fredKey, 30)
        bdti = { ...bdti, history: trimHistory(bPoints) }
      } catch {
        errors.push(`FRED BDTI series "${bdtiFredSeries}" failed or has no data`)
      }
    }
  } else {
    errors.push('FRED_API_KEY missing — Brent spot unavailable')
  }

  const brent: BrentSpreadSnapshot = {
    spotUsd: spotPoints.length ? spotPoints[spotPoints.length - 1].value : null,
    futuresUsd: null,
    spreadUsd: null,
    isBackwardation: null,
    spotDate: spotPoints.length ? spotPoints[spotPoints.length - 1].date : null,
    futuresAsOf: null,
    yahooOk: false,
  }

  const yahoo = await fetchYahooQuotes([BRENT_FUTURES_YAHOO_SYMBOL])
  const quote = yahoo?.quoteResponse?.result?.find((q) => q.symbol === BRENT_FUTURES_YAHOO_SYMBOL)
  if (quote && typeof quote.regularMarketPrice === 'number') {
    brent.futuresUsd = quote.regularMarketPrice
    brent.yahooOk = true
    brent.futuresAsOf = new Date(
      (quote.regularMarketTime ?? Date.now() / 1000) * 1000
    ).toISOString()
  } else {
    errors.push('Yahoo Finance Brent futures (BZ=F) unavailable')
  }

  if (brent.spotUsd !== null && brent.futuresUsd !== null) {
    brent.spreadUsd = brent.spotUsd - brent.futuresUsd
    brent.isBackwardation = brent.spreadUsd > 0.15
  }

  const crashTh = 5
  const bdtiTwoDayCrash = detectBdtiTwoDayCrash(bdti.history, crashTh)
  const bdtiTodayWeak =
    bdti.dailyChangePercent !== null && bdti.dailyChangePercent <= -3
  const spreadTightUsd =
    brent.spreadUsd !== null && brent.spreadUsd < 0.35 && brent.spreadUsd > -0.5

  const hecnTakeProfitHint = Boolean(
    bdtiTwoDayCrash && bdtiTodayWeak && spreadTightUsd && brent.spotUsd !== null
  )

  const alerts: ShippingAlerts = {
    bdtiTwoDayCrash,
    bdtiCrashThresholdPercent: crashTh,
    bdtiTodayWeak,
    spreadTightUsd,
    hecnTakeProfitHint,
  }

  /** Brent 期现价差齐套即可视为主要链路成功；BDTI 可单独缺失 */
  const success = brent.spotUsd !== null && brent.futuresUsd !== null

  return {
    success,
    bdti,
    brent,
    alerts,
    timestamp,
    errors,
  }
}
