import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export interface GoldDetails {
  spot: number | null
  futures: number | null
  futuresChange?: number
  futuresChangePercent?: number
  spread: number | null
  spreadStatus: 'normal' | 'warning' | 'critical'
  spotSource: string
  isBackwardation: boolean
}

/** 狙击战报雷达块（/api/market-data 扩展字段） */
export interface SniperQuoteRow {
  symbol: string
  name: string
  price: number | null
  changePercent: number | null
  lastUpdate?: string | null
}

export interface SniperRadarPayload {
  brentSpot: {
    value: number | null
    previousClose: number | null
    spotDate: string | null
    changePercent: number | null
    yoyPercent: number | null
    yoyCompareDate: string | null
  }
  brentFutures: SniperQuoteRow
  wtiContinuous: SniperQuoteRow
  brentSpotMinusFuturesUsd: number | null
  hyOas: SniperQuoteRow
  gasolineAaa: SniperQuoteRow
  ita: SniperQuoteRow
  qqq: SniperQuoteRow
  itaQqqRatio: number | null
  hk: {
    valueGold03081: SniperQuoteRow
    chinaShenhua01088: SniperQuoteRow
    chinaMobile00941: SniperQuoteRow
    zijinMining02899: SniperQuoteRow
  }
  dataNotes?: string[]
}

export interface MarketDataResponse {
  us10y: {
    value: number
    change: number
    changePercent: number
    lastUpdate: string
  }
  dxy: {
    value: number
    change: number
    changePercent: number
    lastUpdate: string
  }
  brent: {
    value: number
    change: number
    changePercent: number
    lastUpdate: string
  }
  gold: {
    value: number
    change: number
    changePercent: number
    lastUpdate: string
  }
  goldDetails?: GoldDetails
  goldSource?: string
  brentSpot?: boolean
  treasuryRates?: {
    month1: number
    month3: number
    month6: number
    year1: number
    year2: number
    year5: number
    year10: number
    year30: number
    date: string
  }
  sniperRadar?: SniperRadarPayload | null
  source: 'live' | 'fallback'
  timestamp: string
}

export function useMarketData() {
  const { data, error, isLoading, mutate } = useSWR<MarketDataResponse>(
    '/api/market-data',
    fetcher,
    {
      refreshInterval: 60000, // 每分钟刷新
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  )
  
  return {
    data,
    isLoading,
    isError: error,
    refresh: mutate,
    isLive: data?.source === 'live'
  }
}

export interface TreasuryAuctionResponse {
  success: boolean
  message?: string
  auctions: Array<{
    date: string
    type: string
    bidToCover: number
    rate: number | null
    dealerRatio: number | null
    directRatio?: number | null
    indirectRatio?: number | null
    status: 'normal' | 'weak' | 'danger'
    alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL'
    tail?: number
  }>
  latestAuction?: {
    auctionDate: string
    securityTerm: string
    bidToCover?: number
    highYield?: number | null
    dealerRatio?: number
    directRatio?: number
    indirectRatio?: number
    dataAvailable: boolean
  } | null
  evaluation?: {
    alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL'
    status: string
    action: string
  } | null
  summary: {
    avgBidToCover: string
    hasWarning: boolean
    criticalCount?: number
    warningCount?: number
    totalAuctions: number
  }
  source: string
  timestamp: string
}

export function useTreasuryAuctions() {
  const { data, error, isLoading, mutate } = useSWR<TreasuryAuctionResponse>(
    '/api/treasury-auctions',
    fetcher,
    {
      refreshInterval: 3600000, // 每小时刷新
      dedupingInterval: 1800000,
    }
  )
  
  return {
    data,
    auctions: data?.auctions ?? [],
    latestAuction: data?.latestAuction,
    evaluation: data?.evaluation,
    isLoading,
    isError: error,
    isLive: data?.source === 'Treasury Direct',
    refresh: mutate
  }
}

export interface FredDataResponse {
  series: string
  name: string
  unit: string
  latestValue: number | null
  change: number
  changePercent: number
  observations: Array<{ date: string; value: number }>
  source: string
  timestamp: string
}

export function useFredData(series: string = 'DGS10') {
  const { data, error, isLoading, mutate } = useSWR<FredDataResponse>(
    `/api/fred?series=${series}&limit=30`,
    fetcher,
    {
      refreshInterval: 300000, // 每5分钟刷新
      dedupingInterval: 60000,
    }
  )
  
  return {
    data,
    isLoading,
    isError: error,
    refresh: mutate
  }
}

export interface CPIDataResponse {
  data: {
    headline: number | null
    core: number | null
    coreMonthly: number | null
    date: string
    nextReleaseDate: string
    status: 'low' | 'moderate' | 'high'
    isLive: boolean
  }
  history?: {
    headline: Array<{ date: string; value: number }>
    core: Array<{ date: string; value: number }>
  }
  meta?: {
    source: string
    series: { headline: string; core: string }
    timestamp: string
  }
  error?: string
}

export function useCPIData() {
  const { data, error, isLoading, mutate } = useSWR<CPIDataResponse>(
    '/api/cpi',
    fetcher,
    {
      refreshInterval: 3600000, // 每小时刷新，CPI数据每月更新
      dedupingInterval: 1800000,
    }
  )
  
  return {
    data: data?.data,
    history: data?.history,
    isLoading,
    isError: error,
    isLive: data?.data?.isLive ?? false,
    refresh: mutate
  }
}
