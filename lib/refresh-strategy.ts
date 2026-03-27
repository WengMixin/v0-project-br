/**
 * 智能刷新策略配置
 * 
 * 数据分为两类：
 * 1. 低频数据（国债、CPI等）- 按固定时间自动刷新
 * 2. 高频数据（黄金等）- 限制每日刷新次数，定时刷新
 */

export type RefreshFrequency = 'daily' | 'monthly' | 'scheduled' | 'realtime'

export interface RefreshConfig {
  id: string
  name: string
  frequency: RefreshFrequency
  // 对于daily: 每天几点刷新 (0-23)
  // 对于monthly: 每月几号刷新
  // 对于scheduled: 每天的刷新时间点数组
  schedule?: number | number[]
  // 每日最大刷新次数（用于API限制）
  maxDailyRefreshes?: number
  // 缓存时间（秒）
  cacheTTL: number
  // 数据源优先级
  sources: string[]
  // 备用数据源
  fallbackSources?: string[]
}

// 刷新策略配置
export const REFRESH_CONFIGS: Record<string, RefreshConfig> = {
  // 国债收益率 - 每天更新一次，使用FMP
  us10y: {
    id: 'us10y',
    name: '美国10年期国债收益率',
    frequency: 'daily',
    schedule: 8, // 每天早上8点（北京时间，对应美国收盘后）
    cacheTTL: 86400, // 24小时
    sources: ['fmp'],
    fallbackSources: ['yahoo']
  },
  
  // CPI - 每月更新一次
  cpi: {
    id: 'cpi',
    name: '核心CPI',
    frequency: 'monthly',
    schedule: 15, // 每月15日左右发布
    cacheTTL: 2592000, // 30天
    sources: ['fred']
  },
  
  // 布伦特原油 - 每天更新，使用FRED现货价格
  brent: {
    id: 'brent',
    name: '布伦特原油现货',
    frequency: 'daily',
    schedule: 9, // 每天早上9点
    cacheTTL: 86400, // 24小时
    sources: ['fred'],
    fallbackSources: ['yahoo']
  },
  
  // 黄金 - 定时刷新（早中晚各一次），其他时间用Alpha Vantage
  gold: {
    id: 'gold',
    name: '国际黄金现货',
    frequency: 'scheduled',
    schedule: [8, 13, 20], // 早上8点、下午1点、晚上8点
    maxDailyRefreshes: 3, // GoldAPI每月100次，约每天3次
    cacheTTL: 28800, // 8小时
    sources: ['goldapi'],
    fallbackSources: ['alphavantage', 'yahoo']
  },
  
  // 美元指数 - 实时，使用免费Yahoo
  dxy: {
    id: 'dxy',
    name: '美元指数',
    frequency: 'realtime',
    cacheTTL: 300, // 5分钟
    sources: ['yahoo']
  },
  
  // 国债拍卖 - 实时，使用免费Treasury Direct
  treasuryAuction: {
    id: 'treasuryAuction',
    name: '国债拍卖数据',
    frequency: 'realtime',
    cacheTTL: 3600, // 1小时
    sources: ['treasurydirect']
  }
}

// 获取当前时间（北京时间）
export function getBeijingTime(): Date {
  const now = new Date()
  // 转换为北京时间 (UTC+8)
  const beijingOffset = 8 * 60 // 分钟
  const localOffset = now.getTimezoneOffset()
  const beijingTime = new Date(now.getTime() + (localOffset + beijingOffset) * 60 * 1000)
  return beijingTime
}

// 检查是否应该刷新数据
export function shouldRefresh(configId: string, lastRefreshTime?: string): {
  shouldRefresh: boolean
  reason: string
  nextRefreshTime?: string
  useSource: 'primary' | 'fallback'
} {
  const config = REFRESH_CONFIGS[configId]
  if (!config) {
    return { shouldRefresh: true, reason: '配置不存在', useSource: 'primary' }
  }
  
  const now = getBeijingTime()
  const lastRefresh = lastRefreshTime ? new Date(lastRefreshTime) : null
  
  // 如果从未刷新过，立即刷新
  if (!lastRefresh) {
    return { shouldRefresh: true, reason: '首次加载', useSource: 'primary' }
  }
  
  const timeSinceLastRefresh = now.getTime() - lastRefresh.getTime()
  const cacheExpired = timeSinceLastRefresh > config.cacheTTL * 1000
  
  switch (config.frequency) {
    case 'daily': {
      const scheduleHour = config.schedule as number
      const lastRefreshDate = lastRefresh.toDateString()
      const todayDate = now.toDateString()
      
      // 如果今天还没刷新，且已过刷新时间点
      if (lastRefreshDate !== todayDate && now.getHours() >= scheduleHour) {
        return { 
          shouldRefresh: true, 
          reason: `每日 ${scheduleHour}:00 定时刷新`,
          useSource: 'primary'
        }
      }
      
      // 计算下次刷新时间
      const nextRefresh = new Date(now)
      if (now.getHours() >= scheduleHour) {
        nextRefresh.setDate(nextRefresh.getDate() + 1)
      }
      nextRefresh.setHours(scheduleHour, 0, 0, 0)
      
      return { 
        shouldRefresh: false, 
        reason: '等待下次定时刷新',
        nextRefreshTime: nextRefresh.toISOString(),
        useSource: 'fallback'
      }
    }
    
    case 'monthly': {
      const scheduleDay = config.schedule as number
      const lastRefreshMonth = lastRefresh.getMonth()
      const currentMonth = now.getMonth()
      
      // 如果这个月还没刷新，且已过刷新日期
      if (lastRefreshMonth !== currentMonth && now.getDate() >= scheduleDay) {
        return { 
          shouldRefresh: true, 
          reason: `每月 ${scheduleDay} 日定时刷新`,
          useSource: 'primary'
        }
      }
      
      // 计算下次刷新时间
      const nextRefresh = new Date(now)
      if (now.getDate() >= scheduleDay) {
        nextRefresh.setMonth(nextRefresh.getMonth() + 1)
      }
      nextRefresh.setDate(scheduleDay)
      nextRefresh.setHours(0, 0, 0, 0)
      
      return { 
        shouldRefresh: false, 
        reason: '等待下次定时刷新',
        nextRefreshTime: nextRefresh.toISOString(),
        useSource: 'fallback'
      }
    }
    
    case 'scheduled': {
      const scheduleHours = config.schedule as number[]
      const currentHour = now.getHours()
      const lastRefreshDate = lastRefresh.toDateString()
      const todayDate = now.toDateString()
      
      // 找到今天已过去的最近一个刷新时间点
      const passedSchedules = scheduleHours.filter(h => h <= currentHour)
      
      if (passedSchedules.length > 0) {
        const latestPassedHour = Math.max(...passedSchedules)
        const latestPassedTime = new Date(now)
        latestPassedTime.setHours(latestPassedHour, 0, 0, 0)
        
        // 如果最近的刷新时间点比上次刷新时间晚，应该刷新
        if (lastRefresh < latestPassedTime) {
          return { 
            shouldRefresh: true, 
            reason: `定时刷新 (${latestPassedHour}:00)`,
            useSource: 'primary'
          }
        }
      }
      
      // 找下一个刷新时间点
      const futureSchedules = scheduleHours.filter(h => h > currentHour)
      let nextRefreshTime: Date
      
      if (futureSchedules.length > 0) {
        nextRefreshTime = new Date(now)
        nextRefreshTime.setHours(Math.min(...futureSchedules), 0, 0, 0)
      } else {
        // 明天的第一个时间点
        nextRefreshTime = new Date(now)
        nextRefreshTime.setDate(nextRefreshTime.getDate() + 1)
        nextRefreshTime.setHours(Math.min(...scheduleHours), 0, 0, 0)
      }
      
      return { 
        shouldRefresh: false, 
        reason: '使用备用数据源',
        nextRefreshTime: nextRefreshTime.toISOString(),
        useSource: 'fallback'
      }
    }
    
    case 'realtime':
    default:
      if (cacheExpired) {
        return { shouldRefresh: true, reason: '缓存已过期', useSource: 'primary' }
      }
      return { 
        shouldRefresh: false, 
        reason: '缓存有效',
        useSource: 'primary'
      }
  }
}

// 格式化下次刷新时间
export function formatNextRefreshTime(isoString?: string): string {
  if (!isoString) return '实时'
  
  const date = new Date(isoString)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  
  if (diff < 0) return '即将刷新'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}天后`
  }
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟后`
  }
  
  return `${minutes}分钟后`
}

// 获取数据源显示名称
export function getSourceDisplayName(source: string): string {
  const names: Record<string, string> = {
    fmp: 'FMP',
    fred: 'FRED',
    goldapi: 'GoldAPI',
    alphavantage: 'Alpha Vantage',
    yahoo: 'Yahoo Finance',
    treasurydirect: 'Treasury Direct'
  }
  return names[source] || source
}
