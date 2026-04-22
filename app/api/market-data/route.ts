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
// 注意：Yahoo Finance经常从服务器端被屏蔽，所以这个函数可能返回null
async function fetchYahooFinance(symbols: string[]): Promise<YahooFinanceResponse | null> {
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
  
  // 返回null而不是抛出错误，让调用方处理
  console.warn('[v0] Yahoo Finance: All endpoints failed, will use fallback data sources')
  return null
}

// Tiingo Forex API - 黄金现货价格 (XAUUSD)
// 文档: https://www.tiingo.com/documentation/forex
interface TiingoForexResponse {
  ticker: string
  quoteTimestamp: string
  bidPrice: number
  bidSize: number
  askPrice: number
  askSize: number
  midPrice: number
}

async function fetchTiingoGoldSpot(apiKey: string): Promise<{
  price: number
  bidPrice: number
  askPrice: number
  timestamp: string
} | null> {
  try {
    const response = await fetch(
      'https://api.tiingo.com/tiingo/fx/xauusd/top',
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${apiKey}`
        },
        next: { revalidate: 60 }
      }
    )
    
    if (!response.ok) {
      console.error('[v0] Tiingo API response not ok:', response.status)
      return null
    }
    
    const data: TiingoForexResponse[] = await response.json()
    
    if (!Array.isArray(data) || data.length === 0) {
      console.error('[v0] Tiingo API invalid response format')
      return null
    }
    
    const quote = data[0]
    return {
      price: quote.midPrice,
      bidPrice: quote.bidPrice,
      askPrice: quote.askPrice,
      timestamp: quote.quoteTimestamp
    }
  } catch (error) {
    console.error('[v0] Tiingo Gold fetch error:', error)
    return null
  }
}

// MetalpriceAPI - 免费黄金价格备用数据源
// 注意：Alpha Vantage 免费版不支持 XAU 贵金属查询
// 文档: https://metalpriceapi.com/documentation
interface MetalpriceAPIResponse {
  success: boolean
  base: string
  timestamp: number
  rates: {
    XAU?: number
    USD?: number
  }
}

async function fetchMetalpriceGold(apiKey: string): Promise<{
  price: number
  timestamp: string
} | null> {
  try {
    // MetalpriceAPI 返回 1 USD = X XAU，需要反转
    const response = await fetch(
      `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=XAU&currencies=USD`,
      { next: { revalidate: 300 } }
    )
    
    if (!response.ok) {
      console.error('[v0] MetalpriceAPI response not ok:', response.status)
      return null
    }
    
    const data: MetalpriceAPIResponse = await response.json()
    console.log('[v0] MetalpriceAPI response:', JSON.stringify(data))
    
    if (!data.success || !data.rates?.USD) {
      console.error('[v0] MetalpriceAPI invalid data:', data)
      return null
    }
    
    // XAU为基准，rates.USD 表示 1 XAU = X USD
    return {
      price: data.rates.USD,
      timestamp: new Date(data.timestamp * 1000).toISOString()
    }
  } catch (error) {
    console.error('[v0] MetalpriceAPI fetch error:', error)
    return null
  }
}

// Yahoo Finance 黄金期货备用 (GC=F)
async function fetchYahooGold(): Promise<{
  price: number
  change: number
  changePercent: number
  timestamp: string
} | null> {
  const endpoints = [
    'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d',
    'https://query2.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d'
  ]
  
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        next: { revalidate: 60 }
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      const result = data?.chart?.result?.[0]
      
      if (result?.meta) {
        const meta = result.meta
        return {
          price: meta.regularMarketPrice,
          change: meta.regularMarketPrice - meta.previousClose,
          changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('[v0] Yahoo Gold fetch error:', error)
      continue
    }
  }
  return null
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

/** 更长历史：用于布伦特现货同比 YoY */
async function fetchFREDBrentSpotYoy(apiKey: string): Promise<{
  yoyPercent: number | null
  yearAgoDate: string | null
  yearAgoValue: number | null
} | null> {
  try {
    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=DCOILBRENTEU&api_key=${apiKey}&file_type=json&limit=400&sort_order=desc`,
      { next: { revalidate: 3600 } }
    )
    if (!response.ok) return null
    const data = await response.json()
    const obs: FREDObservation[] = (data.observations || []).filter((o: FREDObservation) => o.value !== '.')
    if (obs.length < 2) return null
    const latest = obs[0]
    const latestVal = parseFloat(latest.value)
    const latestTime = new Date(latest.date + 'T12:00:00Z').getTime()
    const target = latestTime - 365 * 24 * 60 * 60 * 1000
    let yearAgo: FREDObservation | null = null
    for (const o of obs) {
      const t = new Date(o.date + 'T12:00:00Z').getTime()
      if (t <= target) {
        yearAgo = o
        break
      }
    }
    if (!yearAgo) return null
    const yv = parseFloat(yearAgo.value)
    if (!Number.isFinite(yv) || yv === 0) return null
    const yoyPercent = ((latestVal - yv) / yv) * 100
    return {
      yoyPercent,
      yearAgoDate: yearAgo.date,
      yearAgoValue: yv,
    }
  } catch (e) {
    console.error('[v0] FRED Brent YoY error:', e)
    return null
  }
}

async function fetchFredSeriesLatest(
  seriesId: string,
  apiKey: string,
  limit = 2
): Promise<{ value: number; date: string; previousValue: number | null; changePercent: number | null } | null> {
  try {
    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=${limit}&sort_order=desc`,
      { next: { revalidate: 3600 } }
    )
    if (!response.ok) return null
    const data = await response.json()
    const obs: FREDObservation[] = (data.observations || []).filter((o: FREDObservation) => o.value !== '.')
    if (obs.length === 0) return null
    const v0 = parseFloat(obs[0].value)
    const v1 = obs.length > 1 ? parseFloat(obs[1].value) : null
    const changePercent =
      v1 !== null && Number.isFinite(v1) && v1 !== 0 ? ((v0 - v1) / v1) * 100 : null
    return { value: v0, date: obs[0].date, previousValue: v1, changePercent }
  } catch (e) {
    console.error(`[v0] FRED ${seriesId} error:`, e)
    return null
  }
}

interface YahooMiniQuote {
  symbol: string
  shortName?: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
  regularMarketTime?: number
}

async function fetchYahooBatchForSniper(symbols: string[]): Promise<YahooMiniQuote[]> {
  const joined = symbols.join(',')
  const endpoints = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(joined)}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(joined)}`,
  ]
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        next: { revalidate: 120 },
      })
      if (!response.ok) continue
      const data = (await response.json()) as {
        quoteResponse?: { result?: YahooMiniQuote[] }
      }
      const r = data.quoteResponse?.result
      if (Array.isArray(r) && r.length) return r
    } catch {
      continue
    }
  }
  return []
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
    
    interface MarketDataItem {
      value: number
      change: number
      changePercent: number
      lastUpdate: string
    }
    
    interface GoldDetailsData {
      spot: number | null
      futures: number | null
      futuresChange: number
      futuresChangePercent: number
      spread: number | null
      spreadStatus: 'normal' | 'warning' | 'critical'
      spotSource: string
      isBackwardation: boolean
    }
    
    const marketData: {
      us10y?: MarketDataItem
      dxy?: MarketDataItem
      brent?: MarketDataItem
      gold?: MarketDataItem
      goldDetails?: GoldDetailsData
      goldSource?: string
      brentSpot?: boolean
      treasuryRates?: Record<string, number | string>
      source?: 'live' | 'fallback'
      timestamp?: string
      [key: string]: MarketDataItem | GoldDetailsData | string | boolean | Record<string, number | string> | undefined
    } = {}
    
    try {
      const yahooData = await fetchYahooFinance(symbolList)
      
      // 只有当yahooData不为null时才处理
      if (yahooData && yahooData.quoteResponse?.result) {
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
    
    // ========== 黄金价格获取：现货为主，期货为辅 ==========
    // 现货 (XAUUSD): 反映真实物理供需，是核心监控指标
    // 期货 (GC=F): 华尔街杠杆资金博弈的���果
    // 正常情况：期货 > 现货 约 $20-30（利息成本）
    // 危机信号：现货 > 期货 = Backwardation（贴水），美元信用崩塌前兆
    
    const tiingoApiKey = process.env.TIINGO_API_KEY
    const goldApiKey = process.env.GOLDAPI_KEY
    const now = new Date()
    const currentHour = now.getHours()
    const goldScheduleHours = [8, 13, 20] // GoldAPI定时刷新时间点
    
    let goldSpotPrice: number | null = null
    let goldSpotSource = 'none'
    let goldFuturesPrice: number | null = null
    let goldFuturesChange: number = 0
    let goldFuturesChangePercent: number = 0
    
    // 首先单独获取期货价格 (GC=F) - 无论如何都要获取用于价差计算
    try {
      const yahooGoldFutures = await fetchYahooGold()
      if (yahooGoldFutures) {
        goldFuturesPrice = yahooGoldFutures.price
        goldFuturesChange = yahooGoldFutures.change
        goldFuturesChangePercent = yahooGoldFutures.changePercent
        console.log('[v0] Gold FUTURES from Yahoo GC=F:', yahooGoldFutures.price)
      }
    } catch (futuresError) {
      console.error('[v0] Yahoo Gold Futures error:', futuresError)
      // 如果Yahoo失败，尝试从之前的marketData获取
      if (marketData.gold) {
        goldFuturesPrice = marketData.gold.value
        goldFuturesChange = marketData.gold.change ?? 0
        goldFuturesChangePercent = marketData.gold.changePercent ?? 0
      }
    }
    
    // 策略1: 优先使用 Tiingo API 获取现货价格（推荐）
    if (tiingoApiKey) {
      try {
        const tiingoData = await fetchTiingoGoldSpot(tiingoApiKey)
        if (tiingoData) {
          goldSpotPrice = tiingoData.price
          goldSpotSource = 'tiingo'
          console.log('[v0] Gold SPOT from Tiingo:', tiingoData.price)
        }
      } catch (tiingoError) {
        console.error('[v0] Tiingo error:', tiingoError)
      }
    }
    
    // 策略2: 定时使用 GoldAPI 获取现货价格
    const isGoldAPIScheduledTime = goldScheduleHours.some(h => 
      Math.abs(currentHour - h) <= 1
    )
    
    if (goldSpotSource === 'none' && isGoldAPIScheduledTime && goldApiKey) {
      try {
        const goldData = await fetchGoldAPIPrice(goldApiKey)
        if (goldData) {
          goldSpotPrice = goldData.price
          goldSpotSource = 'goldapi'
          console.log('[v0] Gold SPOT from GoldAPI:', goldData.price)
        }
      } catch (goldError) {
        console.error('[v0] GoldAPI error:', goldError)
      }
    }
    
    // 策略3: 使用 Yahoo Finance 期货作为后备
    if (goldSpotSource === 'none') {
      try {
        const yahooGold = await fetchYahooGold()
        if (yahooGold) {
          goldSpotPrice = yahooGold.price
          goldSpotSource = 'yahoo_futures'
          console.log('[v0] Gold FUTURES from Yahoo:', yahooGold.price)
        }
      } catch (yahooGoldError) {
        console.error('[v0] Yahoo Gold error:', yahooGoldError)
      }
    }
    
    // 计算现货-期货价差 (Contango/Backwardation)
    let goldSpread: number | null = null
    let goldSpreadStatus: 'normal' | 'warning' | 'critical' = 'normal'
    
    if (goldSpotPrice !== null && goldFuturesPrice !== null) {
      goldSpread = goldFuturesPrice - goldSpotPrice
      
      // 正常: 期货 > 现货 $10-50 (Contango)
      // 警告: 价差收窄到 < $5
      // 危机: 现货 > 期货 (Backwardation) - 美元信用崩塌信号!
      if (goldSpread < 0) {
        goldSpreadStatus = 'critical' // Backwardation!
      } else if (goldSpread < 5) {
        goldSpreadStatus = 'warning'
      }
    }
    
    // 设置主要黄金数据（以现货为主）
    if (goldSpotPrice !== null) {
      const existingGold = marketData.gold
      marketData.gold = {
        value: goldSpotPrice,
        change: existingGold?.change ?? 0,
        changePercent: existingGold?.changePercent ?? 0,
        lastUpdate: new Date().toISOString()
      }
    }
    
    // 添加黄金详细数据
    marketData.goldDetails = {
      spot: goldSpotPrice,
      futures: goldFuturesPrice,
      futuresChange: goldFuturesChange,
      futuresChangePercent: goldFuturesChangePercent,
      spread: goldSpread,
      spreadStatus: goldSpreadStatus,
      spotSource: goldSpotSource,
      isBackwardation: goldSpread !== null && goldSpread < 0
    }
    
    console.log('[v0] Gold Details:', JSON.stringify({
      spot: goldSpotPrice,
      futures: goldFuturesPrice,
      spread: goldSpread,
      spreadStatus: goldSpreadStatus
    }))
    
    // 移除旧的备用逻辑，直接跳到原油获取
    // 原有的 MetalpriceAPI 备用逻辑已被 Tiingo 替代
    let goldSource = goldSpotSource
    
    // 跳过旧的MetalpriceAPI逻辑
    const metalpriceApiKey = process.env.METALPRICE_API_KEY
    if (false && goldSource === 'none' && metalpriceApiKey) {
      try {
        const metalData = await fetchMetalpriceGold(metalpriceApiKey)
        if (metalData) {
          marketData.gold = {
            value: metalData.price,
            change: 0,
            changePercent: 0,
            lastUpdate: metalData.timestamp
          }
          goldSource = 'metalprice'
        }
      } catch (metalError) {
        console.error('[v0] MetalpriceAPI error:', metalError)
      }
    }
    
    // 策略3: 使用Yahoo Finance GC=F（免费无限制）
    if (goldSource === 'none') {
      try {
        const yahooGold = await fetchYahooGold()
        if (yahooGold) {
          marketData.gold = {
            value: yahooGold.price,
            change: yahooGold.change,
            changePercent: yahooGold.changePercent,
            lastUpdate: yahooGold.timestamp
          }
          goldSource = 'yahoo'
          console.log('[v0] Gold price from Yahoo Finance:', yahooGold.price)
        }
      } catch (yahooGoldError) {
        console.error('[v0] Yahoo Gold error:', yahooGoldError)
      }
    }
    
    // 标记数据源
    if (goldSource !== 'none') {
      marketData.goldSource = goldSource
    } else {
      console.warn('[v0] No gold price source available')
    }
    
    // 使用FRED获取布伦特原油现货价格
    const fredApiKey = process.env.FRED_API_KEY
    let brentPreviousClose: number | null = null
    let brentSpotDate: string | null = null
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
          marketData.brentSpot = true
          brentPreviousClose = brentData.previousValue
          brentSpotDate = brentData.date
          console.log('[v0] Brent oil from FRED:', brentData.value, 'date:', brentData.date)
        }
      } catch (fredError) {
        console.error('[v0] FRED Brent error:', fredError)
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
    
    // —— 狙击战报扩展：FRED YoY / HY OAS + Yahoo 多标的 ——
    type SniperQuote = {
      symbol: string
      name: string
      price: number | null
      changePercent: number | null
      currency?: string
      lastUpdate: string | null
    }
    const emptyQuote = (symbol: string, name: string): SniperQuote => ({
      symbol,
      name,
      price: null,
      changePercent: null,
      lastUpdate: null,
    })

    let brentYoyPercent: number | null = null
    let brentYoyAsOf: string | null = null
    let hyOas: SniperQuote = emptyQuote('BAMLH0A0HYM2', 'HY OAS (FRED)')
    let gasolineAaa: SniperQuote = emptyQuote('GASREGW', '全美汽油均价 (FRED)')

    if (fredApiKey) {
      const yoy = await fetchFREDBrentSpotYoy(fredApiKey)
      if (yoy) {
        brentYoyPercent = yoy.yoyPercent
        brentYoyAsOf = yoy.yearAgoDate
      }
      const hy = await fetchFredSeriesLatest('BAMLH0A0HYM2', fredApiKey, 3)
      if (hy) {
        hyOas = {
          symbol: 'BAMLH0A0HYM2',
          name: '高收益债利差 HY OAS (bps, FRED)',
          price: hy.value,
          changePercent: hy.changePercent,
          lastUpdate: hy.date,
        }
      }
      const gas = await fetchFredSeriesLatest('GASREGW', fredApiKey, 3)
      if (gas) {
        gasolineAaa = {
          symbol: 'GASREGW',
          name: '全美汽油均价 (USD/加仑, FRED)',
          price: gas.value,
          changePercent: gas.changePercent,
          lastUpdate: gas.date,
        }
      }
    }

    const sniperSymbols = ['ITA', 'QQQ', '03081.HK', '01088.HK', '00941.HK', '02899.HK', 'BZ=F', 'CL=F']
    const yahooSniper = await fetchYahooBatchForSniper(sniperSymbols)
    const pickY = (sym: string, name: string): SniperQuote => {
      const q = yahooSniper.find((x) => x.symbol === sym)
      if (!q || q.regularMarketPrice == null) return emptyQuote(sym, name)
      return {
        symbol: sym,
        name,
        price: q.regularMarketPrice,
        changePercent: q.regularMarketChangePercent ?? null,
        lastUpdate: q.regularMarketTime
          ? new Date(q.regularMarketTime * 1000).toISOString()
          : null,
      }
    }

    const brentFut = pickY('BZ=F', '布伦特期货 (前月)')
    const wtiFut = pickY('CL=F', 'WTI 原油连续 (CL=F，作能源风险偏好参考)')
    const ita = pickY('ITA', '军工 ETF (ITA)')
    const qqq = pickY('QQQ', '纳斯达克100 (QQQ)')
    const hk03081 = pickY('03081.HK', '价值黄金 (03081)')
    const hk01088 = pickY('01088.HK', '中国神华 (01088)')
    const hk00941 = pickY('00941.HK', '中国移动 (00941)')
    const hk02899 = pickY('02899.HK', '紫金矿业 (02899)')

    let itaQqqRatio: number | null = null
    if (ita.price != null && qqq.price != null && qqq.price !== 0) {
      itaQqqRatio = ita.price / qqq.price
    }

    const brentSpotVal = marketData.brent?.value ?? null
    const brentFutVal = brentFut.price
    let brentSpotFutSpread: number | null = null
    if (brentSpotVal != null && brentFutVal != null) {
      brentSpotFutSpread = brentSpotVal - brentFutVal
    }

    const sniperRadar = {
      brentSpot: {
        value: brentSpotVal,
        previousClose: brentPreviousClose,
        spotDate: brentSpotDate,
        changePercent: marketData.brent?.changePercent ?? null,
        yoyPercent: brentYoyPercent,
        yoyCompareDate: brentYoyAsOf,
      },
      brentFutures: brentFut,
      wtiContinuous: wtiFut,
      brentSpotMinusFuturesUsd: brentSpotFutSpread,
      hyOas: hyOas,
      gasolineAaa: gasolineAaa,
      ita,
      qqq,
      itaQqqRatio,
      hk: {
        valueGold03081: hk03081,
        chinaShenhua01088: hk01088,
        chinaMobile00941: hk00941,
        zijinMining02899: hk02899,
      },
      dataNotes: [
        '港股 Yahoo 代码：03081.HK、01088.HK、00941.HK、02899.HK；若某标的无报价则表格显示为 —',
        'HY OAS：FRED BAMLH0A0HYM2（ICE BofA 高收益 OAS，单位 bps）',
        '汽油：FRED GASREGW（全美常规汽油周均价，USD/加仑）',
      ],
    }

    // 合并数据
    const finalData = {
      us10y: marketData.us10y || fallbackData.us10y,
      dxy: marketData.dxy || fallbackData.dxy,
      brent: marketData.brent || fallbackData.brent,
      gold: marketData.gold || fallbackData.gold,
      goldDetails: marketData.goldDetails,
      goldSource: marketData.goldSource,
      brentSpot: marketData.brentSpot,
      treasuryRates: marketData.treasuryRates,
      sniperRadar,
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
      sniperRadar: null,
      source: 'fallback',
      timestamp: new Date().toISOString()
    })
  }
}
