import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** 默认观察：腾讯、中芯、恒生科技、南方智能汽车、GX中国电车（可按环境变量覆盖） */
const DEFAULT_SYMBOLS = '0700.HK,0981.HK,03033.HK,03165.HK,02845.HK'

interface YahooQuoteResult {
  symbol?: string
  shortName?: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
  regularMarketTime?: number
}

async function fetchYahooQuotes(symbols: string[]): Promise<YahooQuoteResult[]> {
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
      if (!response.ok) continue
      const data = (await response.json()) as {
        quoteResponse?: { result?: YahooQuoteResult[] }
      }
      const r = data.quoteResponse?.result
      if (Array.isArray(r)) return r
    } catch {
      continue
    }
  }
  return []
}

export async function GET() {
  const raw = process.env.HK_YAHOO_SYMBOLS?.trim()
  const symbols = (raw ? raw.split(/[,\s]+/).filter(Boolean) : DEFAULT_SYMBOLS.split(',')).slice(
    0,
    12
  )

  const results = await fetchYahooQuotes(symbols)
  const quotes = symbols.map((sym) => {
    const q = results.find((r) => r.symbol === sym)
    return {
      symbol: sym,
      name: q?.shortName ?? sym,
      price: q?.regularMarketPrice ?? null,
      changePercent: q?.regularMarketChangePercent ?? null,
      asOf: q?.regularMarketTime
        ? new Date(q.regularMarketTime * 1000).toISOString()
        : null,
    }
  })

  const ok = quotes.some((q) => q.price != null)

  return NextResponse.json({
    success: ok,
    quotes,
    source: ok ? 'yahoo' : 'unavailable',
    timestamp: new Date().toISOString(),
    hint: ok
      ? undefined
      : 'Yahoo 在部分服务器无响应；可改用 QOS / iTick / LongPort 等港股 API（自行接代理或换数据源）',
  })
}
