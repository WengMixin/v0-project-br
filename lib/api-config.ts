// 免费金融数据API配置

export const API_SOURCES = {
  // FRED API - 美联储经济数据库 (免费，需要API Key)
  // 获取地址: https://fred.stlouisfed.org/docs/api/api_key.html
  fred: {
    baseUrl: 'https://api.stlouisfed.org/fred',
    endpoints: {
      // 10年期国债收益率
      us10y: 'series/observations?series_id=DGS10',
      // 核心CPI (剔除食品和能源)
      coreCPI: 'series/observations?series_id=CPILFESL',
      // 美联储联邦基金利率
      fedFundsRate: 'series/observations?series_id=FEDFUNDS',
    },
    rateLimit: '120 requests/minute',
    docs: 'https://fred.stlouisfed.org/docs/api/fred/'
  },

  // Alpha Vantage - 股票、外汇、大宗商品 (免费版: 25次/天)
  // 获取地址: https://www.alphavantage.co/support/#api-key
  alphaVantage: {
    baseUrl: 'https://www.alphavantage.co/query',
    endpoints: {
      // 布伦特原油
      brent: 'function=BRENT&interval=daily',
      // WTI原油
      wti: 'function=WTI&interval=daily',
      // 外汇 (可用于计算美元指数相关)
      forex: 'function=FX_DAILY',
    },
    rateLimit: '25 requests/day (free tier)',
    docs: 'https://www.alphavantage.co/documentation/'
  },

  // Financial Modeling Prep - 综合金融数据 (免费版: 250次/天)
  // 获取地址: https://site.financialmodelingprep.com/developer/docs
  fmp: {
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    endpoints: {
      // 国债收益率曲线
      treasuryRates: '/treasury',
      // 大宗商品
      commodities: '/quote/%5EGOLD,BRENTOIL',
    },
    rateLimit: '250 requests/day (free tier)',
    docs: 'https://site.financialmodelingprep.com/developer/docs'
  },

  // 美国财政部官方API (免费，无需Key)
  treasuryDirect: {
    baseUrl: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service',
    endpoints: {
      // 国债拍卖数据
      auctions: '/v2/accounting/od/auction_results',
      // 利率数据
      interestRates: '/v2/accounting/od/avg_interest_rates',
    },
    rateLimit: 'No documented limit',
    docs: 'https://fiscaldata.treasury.gov/api-documentation/'
  }
}

// API数据获取函数类型
export interface FetchOptions {
  apiKey?: string
  useProxy?: boolean
}

// FRED API 数据获取
export async function fetchFredData(
  seriesId: string, 
  apiKey: string,
  limit = 30
): Promise<{ date: string; value: number }[]> {
  const url = `${API_SOURCES.fred.baseUrl}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`
  
  const response = await fetch(url)
  if (!response.ok) throw new Error(`FRED API error: ${response.status}`)
  
  const data = await response.json()
  return data.observations
    .filter((obs: { value: string }) => obs.value !== '.')
    .map((obs: { date: string; value: string }) => ({
      date: obs.date,
      value: parseFloat(obs.value)
    }))
    .reverse()
}

// Alpha Vantage 商品数据获取
export async function fetchAlphaVantageCommodity(
  commodity: 'BRENT' | 'WTI',
  apiKey: string
): Promise<{ date: string; value: number }[]> {
  const url = `${API_SOURCES.alphaVantage.baseUrl}?function=${commodity}&interval=daily&apikey=${apiKey}`
  
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Alpha Vantage API error: ${response.status}`)
  
  const data = await response.json()
  const timeSeries = data.data || []
  
  return timeSeries.slice(0, 30).map((item: { date: string; value: string }) => ({
    date: item.date,
    value: parseFloat(item.value)
  }))
}

// 美国财政部拍卖数据
export async function fetchTreasuryAuctions(
  limit = 10
): Promise<{
  auction_date: string
  security_type: string
  bid_to_cover_ratio: string
  high_rate: string
}[]> {
  const url = `${API_SOURCES.treasuryDirect.baseUrl}${API_SOURCES.treasuryDirect.endpoints.auctions}?sort=-auction_date&page[size]=${limit}&filter=security_type:eq:Note,security_type:eq:Bond`
  
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Treasury API error: ${response.status}`)
  
  const data = await response.json()
  return data.data || []
}
