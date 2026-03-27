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
      
      // 使用备用数据源或返回模拟数据
      const fmpApiKey = process.env.FMP_API_KEY
      
      if (fmpApiKey) {
        const fmpSymbols = {
          us10y: '^TNX',
          gold: 'GCUSD',
          brent: 'BZUSD',
        }
        
        for (const [key, symbol] of Object.entries(fmpSymbols)) {
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
