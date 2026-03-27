import { NextResponse } from 'next/server'

// 使用免费的公开API获取市场数据
// 这些API不需要API Key

interface YahooQuoteResult {
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketTime?: number
  shortName?: string
  symbol?: string
}

interface YahooFinanceResponse {
  quoteResponse?: {
    result?: YahooQuoteResult[]
    error?: unknown
  }
}

// Yahoo Finance API (通过代理或直接访问)
async function fetchYahooFinance(symbols: string[]): Promise<YahooFinanceResponse> {
  const symbolsStr = symbols.join(',')
  
  // 尝试多个数据源
  const endpoints = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsStr}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbolsStr}`,
  ]
  
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        next: { revalidate: 60 } // 缓存60秒
      })
      
      if (response.ok) {
        return await response.json()
      }
    } catch {
      continue
    }
  }
  
  throw new Error('All endpoints failed')
}

// GoldAPI - 获取黄金现货价格
// 文档: https://www.goldapi.io/
interface GoldAPIResponse {
  timestamp: number
  metal: string
  currency: string
  exchange: string
  symbol: string
  prev_close_price: number
  open_price: number
  low_price: number
  high_price: number
  open_time: number
  price: number
  ch: number
  chp: number
  ask: number
  bid: number
}

async function fetchGoldAPIPrice(apiKey: string): Promise<{
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  timestamp: string
} | null> {
  try {
    const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
      headers: {
        'x-access-token': apiKey,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 } // 缓存60秒
    })
    
    if (!response.ok) return null
    
    const data: GoldAPIResponse = await response.json()
    
    return {
      price: data.price,
      change: data.ch,
      changePercent: data.chp,
      high: data.high_price,
      low: data.low_price,
      timestamp: new Date(data.timestamp * 1000).toISOString()
    }
  } catch (error) {
    console.error('GoldAPI fetch error:', error)
    return null
  }
}

// FMP Treasury Rates API - 获取国债收益率
interface FMPTreasuryRate {
  date: string
  month1: number
  month2: number
  month3: number
  month6: number
  year1: number
  year2: number
  year3: number
  year5: number
  year7: number
  year10: number
  year20: number
  year30: number
}

async function fetchFMPTreasuryRates(apiKey: string): Promise<FMPTreasuryRate | null> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/stable/treasury-rates?apikey=${apiKey}`,
      { next: { revalidate: 60 } }
    )
    if (!response.ok) return null
    
    const data = await response.json()
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch {
    return null
  }
}

// FRED API - 获取布伦特原油现货价格 (DCOILBRENTEU)
// 现货价格比期货更能反映真实供需，是美联储决策的关键参考指标
interface FREDObservation {
  date: string
  value: string
}

async function fetchFREDBrentOil(apiKey: string): Promise<{
  value: number
  previousValue: number
  change: number
  changePercent: number
  date: string
} | null> {
  try {
    // 获取最近5个交易日的数据以计算变动
    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=DCOILBRENTEU&api_key=${apiKey}&file_type=json&limit=5&sort_order=desc`,
      { next: { revalidate: 300 } } // 缓存5分钟
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data.observations || data.observations.length === 0) return null
    
    // 获取最新值和前一个值
    const observations: FREDObservation[] = data.observations.filter(
      (obs: FREDObservation) => obs.value !== '.'
    )
    
    if (observations.length === 0) return null
    
    const latestValue = parseFloat(observations[0].value)
    const previousValue = observations.length > 1 ? parseFloat(observations[1].value) : latestValue
    const change = latestValue - previousValue
    const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0
    
    return {
      value: latestValue,
      previousValue,
      change,
      changePercent,
      date: observations[0].date
    }
  } catch (error) {
    console.error('FRED Brent Oil fetch error:', error)
    return null
  }
}

// 备用: 使用 Financial Modeling Prep 免费API
async function fetchFMPData(symbol: string, apiKey?: string): Promise<{
  price: number
  change: number
  changesPercentage: number
} | null> {
  if (!apiKey) return null
  
  const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`
  
  try {
    const response = await fetch(url, { next: { revalidate: 60 } })
    if (!response.ok) return null
    
    const data = await response.json()
    return data[0] || null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    // 市场代码映射
    const symbols = {
      us10y: '^TNX',      // 10年期国债收益率
      dxy: 'DX-Y.NYB',    // 美元指数
      brent: 'BZ=F',      // 布伦特原油期货
      gold: 'GC=F',       // 黄金期货
    }
    
    const symbolList = Object.values(symbols)
    
    let marketData: Record<string, {
      value: number
      change: number
      changePercent: number
      lastUpdate: string
    }> = {}
    
    try {
      const yahooData = await fetchYahooFinance(symbolList)
      
      if (yahooData.quoteResponse?.result) {
        const results = yahooData.quoteResponse.result
        
        for (const [key, symbol] of Object.entries(symbols)) {
          const quote = results.find(r => r.symbol === symbol)
          if (quote) {
            marketData[key] = {
              value: quote.regularMarketPrice || 0,
              change: quote.regularMarketChange || 0,
              changePercent: quote.regularMarketChangePercent || 0,
              lastUpdate: new Date(
                (quote.regularMarketTime || Date.now() / 1000) * 1000
              ).toISOString()
            }
          }
        }
      }
    } catch (yahooError) {
      console.error('Yahoo Finance error:', yahooError)
    }
    
    // 优先使用GoldAPI获取黄金现货价格
    const goldApiKey = process.env.GOLDAPI_KEY
    if (goldApiKey) {
      try {
        const goldData = await fetchGoldAPIPrice(goldApiKey)
        if (goldData) {
          marketData.gold = {
            value: goldData.price,
            change: goldData.change,
            changePercent: goldData.changePercent,
            lastUpdate: goldData.timestamp
          }
          // 标记为GoldAPI数据源
          marketData.goldSource = 'goldapi' as unknown as typeof marketData.gold
        }
      } catch (goldError) {
        console.error('GoldAPI error:', goldError)
      }
    }
    
    // 优先使用FRED获取布伦特原油现货价格
    const fredApiKey = process.env.FRED_API_KEY
    if (fredApiKey) {
      try {
        const brentData = await fetchFREDBrentOil(fredApiKey)
        if (brentData) {
          marketData.brent = {
            value: brentData.value,
            change: brentData.change,
            changePercent: brentData.changePercent,
            lastUpdate: brentData.date
          }
          // 标记为现货数据
          marketData.brentSpot = true as unknown as typeof marketData.brent
        }
      } catch (fredError) {
        console.error('FRED Brent error:', fredError)
      }
    }
    
    // 使用FMP Treasury Rates API获取国债收益率数据
    const fmpApiKey = process.env.FMP_API_KEY
    if (fmpApiKey) {
      try {
        const treasuryData = await fetchFMPTreasuryRates(fmpApiKey)
        if (treasuryData) {
          // 使用FMP数据覆盖国债收益率
          marketData.us10y = {
            value: treasuryData.year10,
            change: 0, // FMP不提供变动数据，需要另外计算
            changePercent: 0,
            lastUpdate: treasuryData.date
          }
          
          // 可以额外提供其他期限的国债数据
          marketData.treasuryRates = {
            month1: treasuryData.month1,
            month3: treasuryData.month3,
            month6: treasuryData.month6,
            year1: treasuryData.year1,
            year2: treasuryData.year2,
            year5: treasuryData.year5,
            year10: treasuryData.year10,
            year30: treasuryData.year30,
            date: treasuryData.date
          } as unknown as typeof marketData.us10y
        }
      } catch (fmpError) {
        console.error('FMP Treasury error:', fmpError)
      }
      
      // 使用FMP获取其他数据作为备用
      if (!marketData.gold || !marketData.brent) {
        const fmpSymbols = {
          gold: 'GCUSD',
          brent: 'BZUSD',
        }
        
        for (const [key, symbol] of Object.entries(fmpSymbols)) {
          if (!marketData[key]) {
            const data = await fetchFMPData(symbol, fmpApiKey)
            if (data) {
              marketData[key] = {
                value: data.price,
                change: data.change,
                changePercent: data.changesPercentage,
                lastUpdate: new Date().toISOString()
              }
            }
          }
        }
      }
    }
    
    // 如果某些数据获取失败，使用备用值
    const fallbackData = {
      us10y: { value: 4.39, change: 0.02, changePercent: 0.46, lastUpdate: new Date().toISOString() },
      dxy: { value: 104.25, change: -0.15, changePercent: -0.14, lastUpdate: new Date().toISOString() },
      brent: { value: 73.50, change: 0.85, changePercent: 1.17, lastUpdate: new Date().toISOString() },
      gold: { value: 3010.20, change: 12.30, changePercent: 0.41, lastUpdate: new Date().toISOString() },
    }
    
    // 合并数据
    const finalData = {
      us10y: marketData.us10y || fallbackData.us10y,
      dxy: marketData.dxy || fallbackData.dxy,
      brent: marketData.brent || fallbackData.brent,
      gold: marketData.gold || fallbackData.gold,
      source: Object.keys(marketData).length > 0 ? 'live' : 'fallback',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(finalData)
    
  } catch (error) {
    console.error('Market data fetch error:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch market data',
      us10y: { value: 4.39, change: 0.02, changePercent: 0.46, lastUpdate: new Date().toISOString() },
      dxy: { value: 104.25, change: -0.15, changePercent: -0.14, lastUpdate: new Date().toISOString() },
      brent: { value: 73.50, change: 0.85, changePercent: 1.17, lastUpdate: new Date().toISOString() },
      gold: { value: 3010.20, change: 12.30, changePercent: 0.41, lastUpdate: new Date().toISOString() },
      source: 'fallback',
      timestamp: new Date().toISOString()
    })
  }
}
