import { NextResponse } from 'next/server'

// FRED API - 美联储经济数据库
// 免费获取API Key: https://fred.stlouisfed.org/docs/api/api_key.html

interface FredObservation {
  date: string
  value: string
}

interface FredResponse {
  observations?: FredObservation[]
}

const FRED_SERIES = {
  // 国债收益率
  DGS10: { name: '10年期国债收益率', unit: '%' },
  DGS2: { name: '2年期国债收益率', unit: '%' },
  DGS30: { name: '30年期国债收益率', unit: '%' },
  
  // 通胀数据
  CPIAUCSL: { name: 'CPI (所有项目)', unit: '%' },
  CPILFESL: { name: '核心CPI (剔除食品能源)', unit: '%' },
  
  // 利率
  FEDFUNDS: { name: '联邦基金利率', unit: '%' },
  
  // 经济指标
  UNRATE: { name: '失业率', unit: '%' },
  GDP: { name: 'GDP', unit: 'B$' },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const seriesId = searchParams.get('series') || 'DGS10'
  const limit = searchParams.get('limit') || '30'
  
  // 优先使用环境变量中的API Key
  const apiKey = process.env.FRED_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'FRED_API_KEY not configured',
      message: '请在环境变量中设置 FRED_API_KEY',
      howToGet: 'https://fred.stlouisfed.org/docs/api/api_key.html',
      availableSeries: FRED_SERIES
    }, { status: 400 })
  }
  
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`
    
    const response = await fetch(url, {
      next: { revalidate: 300 } // 缓存5分钟
    })
    
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`)
    }
    
    const data: FredResponse = await response.json()
    
    // 处理数据
    const observations = (data.observations || [])
      .filter((obs: FredObservation) => obs.value !== '.')
      .map((obs: FredObservation) => ({
        date: obs.date,
        value: parseFloat(obs.value)
      }))
      .reverse()
    
    const latestValue = observations.length > 0 
      ? observations[observations.length - 1].value 
      : null
    
    const previousValue = observations.length > 1 
      ? observations[observations.length - 2].value 
      : null
    
    const change = latestValue && previousValue 
      ? latestValue - previousValue 
      : 0
    
    return NextResponse.json({
      series: seriesId,
      name: FRED_SERIES[seriesId as keyof typeof FRED_SERIES]?.name || seriesId,
      unit: FRED_SERIES[seriesId as keyof typeof FRED_SERIES]?.unit || '',
      latestValue,
      change,
      changePercent: previousValue ? (change / previousValue) * 100 : 0,
      observations,
      source: 'FRED',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('FRED API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch FRED data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
