import { NextResponse } from 'next/server'

interface ConnectionStatus {
  name: string
  status: 'connected' | 'error' | 'not_configured'
  message: string
  latency?: number
}

export async function GET() {
  const results: ConnectionStatus[] = []

// Test FRED API - 测试CPI数据获取（同比变化率）
  const fredKey = process.env.FRED_API_KEY
  if (fredKey) {
    const start = Date.now()
    try {
      // 使用 units=pc1 获取核心CPI同比变化率
      const res = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=CPILFESL&api_key=${fredKey}&file_type=json&limit=1&sort_order=desc&units=pc1`
      )
      const latency = Date.now() - start
      if (res.ok) {
        const data = await res.json()
        if (data.observations && data.observations.length > 0) {
          const obs = data.observations[0]
          const cpiValue = parseFloat(obs.value).toFixed(2)
          
          // 同时测试布伦特原油现货价格
          const brentRes = await fetch(
            `https://api.stlouisfed.org/fred/series/observations?series_id=DCOILBRENTEU&api_key=${fredKey}&file_type=json&limit=1&sort_order=desc`
          )
          let brentMsg = ''
          if (brentRes.ok) {
            const brentData = await brentRes.json()
            if (brentData.observations && brentData.observations.length > 0) {
              const brentObs = brentData.observations[0]
              if (brentObs.value !== '.') {
                brentMsg = `，布伦特原油现货: $${parseFloat(brentObs.value).toFixed(2)}/桶 (${brentObs.date})`
              }
            }
          }
          
          results.push({
            name: 'FRED API',
            status: 'connected',
            message: `连接成功，核心CPI同比: ${cpiValue}%${brentMsg}`,
            latency
          })
        } else {
          results.push({
            name: 'FRED API',
            status: 'error',
            message: '响应格式异常',
            latency
          })
        }
      } else {
        results.push({
          name: 'FRED API',
          status: 'error',
          message: `API返回错误: ${res.status}`,
          latency
        })
      }
    } catch (error) {
      results.push({
        name: 'FRED API',
        status: 'error',
        message: `连接失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  } else {
    results.push({
      name: 'FRED API',
      status: 'not_configured',
      message: '未配置 FRED_API_KEY'
    })
  }

  // Test Alpha Vantage API (仅用于外汇，不支持黄金XAU)
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY
  if (alphaKey) {
    const start = Date.now()
    try {
      const res = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=CNY&apikey=${alphaKey}`
      )
      const latency = Date.now() - start
      if (res.ok) {
        const data = await res.json()
        if (data['Realtime Currency Exchange Rate']) {
          const rate = data['Realtime Currency Exchange Rate']['5. Exchange Rate']
          results.push({
            name: 'Alpha Vantage',
            status: 'connected',
            message: `连接成功，USD/CNY: ${parseFloat(rate).toFixed(4)} (注：免费版不支持XAU黄金)`,
            latency
          })
        } else if (data.Note) {
          results.push({
            name: 'Alpha Vantage',
            status: 'error',
            message: '达到API调用限制(25次/天)，请稍后再试',
            latency
          })
        } else {
          results.push({
            name: 'Alpha Vantage',
            status: 'error',
            message: '响应格式异常',
            latency
          })
        }
      } else {
        results.push({
          name: 'Alpha Vantage',
          status: 'error',
          message: `API返回错误: ${res.status}`,
          latency
        })
      }
    } catch (error) {
      results.push({
        name: 'Alpha Vantage',
        status: 'error',
        message: `连接失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  } else {
    results.push({
      name: 'Alpha Vantage',
      status: 'not_configured',
      message: '未配置 (可选，免费版不支持黄金价格)'
    })
  }
  
  // Test Yahoo Finance 黄金期货 GC=F（免费备用数据源）
  {
    const start = Date.now()
    try {
      const res = await fetch(
        'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      )
      const latency = Date.now() - start
      if (res.ok) {
        const data = await res.json()
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
        if (price) {
          results.push({
            name: 'Yahoo Finance (黄金)',
            status: 'connected',
            message: `连接成功，黄金期货GC=F: $${price.toFixed(2)}/盎司`,
            latency
          })
        } else {
          results.push({
            name: 'Yahoo Finance (黄金)',
            status: 'error',
            message: '响应格式异常',
            latency
          })
        }
      } else {
        results.push({
          name: 'Yahoo Finance (黄金)',
          status: 'error',
          message: `API返回错误: ${res.status}`,
          latency
        })
      }
    } catch (error) {
      results.push({
        name: 'Yahoo Finance (黄金)',
        status: 'error',
        message: `连接失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  // Test Financial Modeling Prep API - 使用Treasury Rates端点
  const fmpKey = process.env.FMP_API_KEY
  if (fmpKey) {
    const start = Date.now()
    try {
      // 使用FMP的stable Treasury Rates API
      const res = await fetch(
        `https://financialmodelingprep.com/stable/treasury-rates?apikey=${fmpKey}`
      )
      const latency = Date.now() - start
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const latestData = data[0]
          results.push({
            name: 'Financial Modeling Prep',
            status: 'connected',
            message: `连接成功，10Y国债收益率: ${latestData.year10}% (${latestData.date})`,
            latency
          })
        } else if (data['Error Message']) {
          results.push({
            name: 'Financial Modeling Prep',
            status: 'error',
            message: data['Error Message'],
            latency
          })
        } else {
          results.push({
            name: 'Financial Modeling Prep',
            status: 'error',
            message: '响应格式异常',
            latency
          })
        }
      } else {
        results.push({
          name: 'Financial Modeling Prep',
          status: 'error',
          message: `API返回错误: ${res.status}`,
          latency
        })
      }
    } catch (error) {
      results.push({
        name: 'Financial Modeling Prep',
        status: 'error',
        message: `连接失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  } else {
    results.push({
      name: 'Financial Modeling Prep',
      status: 'not_configured',
      message: '未配置 FMP_API_KEY'
    })
  }

  // Test GoldAPI for gold spot price
  const goldApiKey = process.env.GOLDAPI_KEY
  if (goldApiKey) {
    const start = Date.now()
    try {
      const res = await fetch('https://www.goldapi.io/api/XAU/USD', {
        headers: {
          'x-access-token': goldApiKey,
          'Content-Type': 'application/json'
        }
      })
      const latency = Date.now() - start
      if (res.ok) {
        const data = await res.json()
        results.push({
          name: 'GoldAPI',
          status: 'connected',
          message: `连接成功，黄金现货: $${data.price?.toFixed(2) || 'N/A'}/盎司`,
          latency
        })
      } else {
        results.push({
          name: 'GoldAPI',
          status: 'error',
          message: `API返回错误: ${res.status}`,
          latency
        })
      }
    } catch (error) {
      results.push({
        name: 'GoldAPI',
        status: 'error',
        message: `连接失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  } else {
    results.push({
      name: 'GoldAPI',
      status: 'not_configured',
      message: '未配置 GOLDAPI_KEY'
    })
  }

  // Test free APIs (Yahoo Finance proxy, Treasury Direct)
  // Yahoo Finance (via unofficial API)
  try {
    const start = Date.now()
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=1d'
    )
    const latency = Date.now() - start
    if (res.ok) {
      results.push({
        name: 'Yahoo Finance',
        status: 'connected',
        message: '连接成功（免费，无需配置）',
        latency
      })
    } else {
      results.push({
        name: 'Yahoo Finance',
        status: 'error',
        message: `API返回错误: ${res.status}`
      })
    }
  } catch {
    results.push({
      name: 'Yahoo Finance',
      status: 'error',
      message: '连接失败'
    })
  }

  // Treasury Direct API
  try {
    const start = Date.now()
    const res = await fetch(
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?page[size]=1'
    )
    const latency = Date.now() - start
    if (res.ok) {
      results.push({
        name: 'Treasury Direct',
        status: 'connected',
        message: '连接成功（免费，无需配置）',
        latency
      })
    } else {
      results.push({
        name: 'Treasury Direct',
        status: 'error',
        message: `API返回错误: ${res.status}`
      })
    }
  } catch {
    results.push({
      name: 'Treasury Direct',
      status: 'error',
      message: '连接失败'
    })
  }

  const allConnected = results.every(r => r.status === 'connected')
  const connectedCount = results.filter(r => r.status === 'connected').length

  return NextResponse.json({
    success: allConnected,
    summary: `${connectedCount}/${results.length} 数据源已连接`,
    connections: results,
    timestamp: new Date().toISOString()
  })
}
