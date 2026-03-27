import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

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
  auctions: Array<{
    date: string
    type: string
    bidToCover: number | null
    rate: number | null
    status: 'normal' | 'weak' | 'danger'
  }>
  summary: {
    avgBidToCover: string
    hasWarning: boolean
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
    isLoading,
    isError: error,
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
