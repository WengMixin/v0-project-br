// 市场数据类型定义和模拟数据

export interface MarketIndicator {
  name: string
  value: number
  change: number
  changePercent: number
  status: 'bullish' | 'bearish' | 'neutral' | 'warning' | 'danger'
  lastUpdate: Date
}

export interface TreasuryAuction {
  date: string
  type: string
  bidToCover: number
  tail: number
  status: 'normal' | 'weak' | 'danger'
}

export interface FedStatement {
  date: string
  speaker: string
  summary: string
  sentiment: 'hawkish' | 'dovish' | 'neutral'
  keywords: string[]
}

export interface CPIData {
  date: string
  headline: number
  core: number
  coreMonthly: number
  status: 'high' | 'moderate' | 'low'
}

// 模拟实时数据
export function getMarketData(): {
  us10y: MarketIndicator
  dxy: MarketIndicator
  brent: MarketIndicator
  gold: MarketIndicator
} {
  const now = new Date()
  
  return {
    us10y: {
      name: '美国10年期国债收益率',
      value: 4.67,
      change: 0.05,
      changePercent: 1.08,
      status: 'warning',
      lastUpdate: now
    },
    dxy: {
      name: '美元指数',
      value: 104.25,
      change: -0.32,
      changePercent: -0.31,
      status: 'neutral',
      lastUpdate: now
    },
    brent: {
      name: '布伦特原油',
      value: 82.45,
      change: 1.23,
      changePercent: 1.51,
      status: 'bullish',
      lastUpdate: now
    },
    gold: {
      name: '国际黄金',
      value: 2648.30,
      change: 15.40,
      changePercent: 0.58,
      status: 'bullish',
      lastUpdate: now
    }
  }
}

export function getTreasuryAuctions(): TreasuryAuction[] {
  return [
    {
      date: '2026-03-25',
      type: '10年期国债',
      bidToCover: 2.45,
      tail: 0.8,
      status: 'normal'
    },
    {
      date: '2026-03-20',
      type: '30年期国债',
      bidToCover: 2.12,
      tail: 2.1,
      status: 'weak'
    },
    {
      date: '2026-03-15',
      type: '20年期国债',
      bidToCover: 2.58,
      tail: 0.5,
      status: 'normal'
    }
  ]
}

export function getFedStatements(): FedStatement[] {
  return [
    {
      date: '2026-03-26',
      speaker: '鲍威尔',
      summary: '重申将维持限制性利率政策直至确信通胀持续向2%目标回落，强调劳动力市场仍然强劲。',
      sentiment: 'hawkish',
      keywords: ['Higher for longer', '通胀黏性', '限制性政策']
    },
    {
      date: '2026-03-24',
      speaker: '沃勒',
      summary: '表示需要更多数据确认通胀下行趋势，不急于调整货币政策立场。',
      sentiment: 'hawkish',
      keywords: ['数据依赖', '维持利率']
    },
    {
      date: '2026-03-22',
      speaker: '巴尔金',
      summary: '关注银行系统流动性状况，提及需警惕信贷紧缩对经济的潜在影响。',
      sentiment: 'neutral',
      keywords: ['金融稳定', '流动性']
    }
  ]
}

export function getCPIData(): CPIData {
  return {
    date: '2026-03-12',
    headline: 3.2,
    core: 3.8,
    coreMonthly: 0.4,
    status: 'high'
  }
}

// 警戒线配置
export const THRESHOLDS = {
  us10y: {
    warning: 4.5,
    danger: 5.0
  },
  dxy: {
    high: 105,
    low: 100
  },
  brent: {
    high: 90,
    veryHigh: 100
  },
  coreCPI: {
    high: 0.3,
    veryHigh: 0.4
  },
  bidToCover: {
    warning: 2.3,
    danger: 2.0
  }
}

// 历史数据用于图表
export function getUS10YHistory(): { date: string; value: number }[] {
  return [
    { date: '03-21', value: 4.42 },
    { date: '03-22', value: 4.48 },
    { date: '03-23', value: 4.55 },
    { date: '03-24', value: 4.58 },
    { date: '03-25', value: 4.62 },
    { date: '03-26', value: 4.65 },
    { date: '03-27', value: 4.67 }
  ]
}

export function getDXYHistory(): { date: string; value: number }[] {
  return [
    { date: '03-21', value: 104.85 },
    { date: '03-22', value: 104.62 },
    { date: '03-23', value: 104.45 },
    { date: '03-24', value: 104.38 },
    { date: '03-25', value: 104.52 },
    { date: '03-26', value: 104.57 },
    { date: '03-27', value: 104.25 }
  ]
}

export function getBrentHistory(): { date: string; value: number }[] {
  return [
    { date: '03-21', value: 79.85 },
    { date: '03-22', value: 80.12 },
    { date: '03-23', value: 80.45 },
    { date: '03-24', value: 81.22 },
    { date: '03-25', value: 81.88 },
    { date: '03-26', value: 81.22 },
    { date: '03-27', value: 82.45 }
  ]
}

export function getGoldHistory(): { date: string; value: number }[] {
  return [
    { date: '03-21', value: 2612.50 },
    { date: '03-22', value: 2618.80 },
    { date: '03-23', value: 2625.30 },
    { date: '03-24', value: 2632.90 },
    { date: '03-25', value: 2638.45 },
    { date: '03-26', value: 2632.90 },
    { date: '03-27', value: 2648.30 }
  ]
}
