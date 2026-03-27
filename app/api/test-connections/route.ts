import { NextResponse } from 'next/server'

interface ConnectionStatus {
  name: string
  status: 'connected' | 'error' | 'not_configured'
  message: string
  latency?: number
}

export async function GET() {
  const results: ConnectionStatus[] = []

  // Test FRED API
  const fredKey = process.env.FRED_API_KEY
  if (fredKey) {
    const start = Date.now()
    try {
      const res = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${fredKey}&file_type=json&limit=1`
      )
      const latency = Date.now() - start
      if (res.ok) {
        const data = await res.json()
        if (data.observations) {
          results.push({
            name: 'FRED API',
            status: 'connected',
            message: `连接成功，最新10年期国债数据: ${data.observations[0]?.value || 'N/A'}%`,
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

  // Test Alpha Vantage API
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
            message: `连接成功，USD/CNY汇率: ${parseFloat(rate).toFixed(4)}`,
            latency
          })
        } else if (data.Note) {
          results.push({
            name: 'Alpha Vantage',
            status: 'error',
            message: '达到API调用限制，请稍后再试',
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
      message: '未配置 ALPHA_VANTAGE_API_KEY'
    })
  }

  // Test Financial Modeling Prep API
  const fmpKey = process.env.FMP_API_KEY
  if (fmpKey) {
    const start = Date.now()
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/^TNX?apikey=${fmpKey}`
      )
      const latency = Date.now() - start
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          results.push({
            name: 'Financial Modeling Prep',
            status: 'connected',
            message: `连接成功，10Y收益率: ${data[0]?.price || 'N/A'}%`,
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
            status: 'connected',
            message: '连接成功',
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
