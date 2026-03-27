import { NextResponse } from 'next/server'

// FRED CPI Series IDs
// CPIAUCSL - Consumer Price Index for All Urban Consumers (All Items)
// CPILFESL - Consumer Price Index for All Urban Consumers: All Items Less Food and Energy (Core CPI)

interface FredObservation {
  date: string
  value: string
}

interface FredResponse {
  observations?: FredObservation[]
}

async function fetchFredSeries(
  seriesId: string, 
  apiKey: string, 
  units: string = 'lin',
  limit: number = 2
): Promise<FredObservation[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}&units=${units}`
  
  const response = await fetch(url, {
    next: { revalidate: 3600 } // 缓存1小时，CPI数据每月更新一次
  })
  
  if (!response.ok) {
    throw new Error(`FRED API error: ${response.status}`)
  }
  
  const data: FredResponse = await response.json()
  return (data.observations || []).filter(obs => obs.value !== '.')
}

// CPI发布日期通常是每月10-15日左右
function getNextCPIReleaseDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  // 假设CPI在每月10日左右发布
  let releaseDate = new Date(year, month, 10)
  
  // 如果当前日期已过10日，则下次发布在下个月
  if (now.getDate() > 15) {
    releaseDate = new Date(year, month + 1, 10)
  }
  
  return releaseDate.toISOString().split('T')[0]
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'FRED_API_KEY not configured',
      message: '请在环境变量中设置 FRED_API_KEY',
      howToGet: 'https://fred.stlouisfed.org/docs/api/api_key.html',
      // 返回模拟数据
      data: {
        headline: 3.2,
        core: 3.8,
        coreMonthly: 0.35,
        date: '2026-02-01',
        nextReleaseDate: getNextCPIReleaseDate(),
        status: 'moderate',
        isLive: false
      }
    })
  }
  
  try {
    // 并行获取多个数据系列
    const [
      headlineYoY,     // 整体CPI同比 (使用 pc1 = Percent Change from Year Ago)
      coreYoY,         // 核心CPI同比
      coreMoM,         // 核心CPI环比 (使用 pch = Percent Change)
    ] = await Promise.all([
      fetchFredSeries('CPIAUCSL', apiKey, 'pc1', 2),  // 整体CPI同比
      fetchFredSeries('CPILFESL', apiKey, 'pc1', 2),  // 核心CPI同比
      fetchFredSeries('CPILFESL', apiKey, 'pch', 2),  // 核心CPI环比
    ])

    // 获取最新数据
    const latestHeadlineYoY = headlineYoY[0] ? parseFloat(headlineYoY[0].value) : null
    const latestCoreYoY = coreYoY[0] ? parseFloat(coreYoY[0].value) : null
    const latestCoreMoM = coreMoM[0] ? parseFloat(coreMoM[0].value) : null
    const latestDate = coreYoY[0]?.date || headlineYoY[0]?.date || ''

    // 判断通胀状态
    let status: 'low' | 'moderate' | 'high' = 'low'
    if (latestCoreMoM !== null) {
      if (latestCoreMoM >= 0.4) {
        status = 'high'
      } else if (latestCoreMoM >= 0.3) {
        status = 'moderate'
      }
    }

    // 历史数据用于图表
    const [headlineHistory, coreHistory] = await Promise.all([
      fetchFredSeries('CPIAUCSL', apiKey, 'pc1', 12),
      fetchFredSeries('CPILFESL', apiKey, 'pc1', 12),
    ])

    return NextResponse.json({
      data: {
        headline: latestHeadlineYoY !== null ? Math.round(latestHeadlineYoY * 100) / 100 : null,
        core: latestCoreYoY !== null ? Math.round(latestCoreYoY * 100) / 100 : null,
        coreMonthly: latestCoreMoM !== null ? Math.round(latestCoreMoM * 100) / 100 : null,
        date: latestDate,
        nextReleaseDate: getNextCPIReleaseDate(),
        status,
        isLive: true
      },
      history: {
        headline: headlineHistory.reverse().map(obs => ({
          date: obs.date,
          value: parseFloat(obs.value)
        })),
        core: coreHistory.reverse().map(obs => ({
          date: obs.date,
          value: parseFloat(obs.value)
        }))
      },
      meta: {
        source: 'FRED (Federal Reserve Economic Data)',
        series: {
          headline: 'CPIAUCSL',
          core: 'CPILFESL'
        },
        units: {
          yoy: 'Percent Change from Year Ago (pc1)',
          mom: 'Percent Change (pch)'
        },
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('CPI API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch CPI data',
      message: error instanceof Error ? error.message : 'Unknown error',
      // 返回模拟数据作为后备
      data: {
        headline: 3.2,
        core: 3.8,
        coreMonthly: 0.35,
        date: '2026-02-01',
        nextReleaseDate: getNextCPIReleaseDate(),
        status: 'moderate',
        isLive: false
      }
    }, { status: 500 })
  }
}
