'use client'

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Activity, RefreshCw, Clock, Info, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

interface RefreshStatus {
  gold: { nextRefresh: string; source: string }
  us10y: { nextRefresh: string; source: string }
  cpi: { nextRefresh: string; source: string }
  brent: { nextRefresh: string; source: string }
}

interface DashboardHeaderProps {
  onRefresh?: () => void
  isRefreshing?: boolean
  /** e.g. Ollama chat trigger */
  extraActions?: ReactNode
}

export function DashboardHeader({ onRefresh, isRefreshing = false, extraActions }: DashboardHeaderProps) {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }
  
  // 计算下次刷新时间
  const calculateNextRefresh = useCallback(() => {
    const now = new Date()
    const currentHour = now.getHours()
    
    // 黄金：早8点、下午1点、晚8点
    const goldSchedule = [8, 13, 20]
    const nextGoldHour = goldSchedule.find(h => h > currentHour) || goldSchedule[0]
    const nextGoldRefresh = new Date(now)
    if (nextGoldHour <= currentHour) {
      nextGoldRefresh.setDate(nextGoldRefresh.getDate() + 1)
    }
    nextGoldRefresh.setHours(nextGoldHour, 0, 0, 0)
    
    // 国债/原油：每天早上8/9点
    const nextDailyRefresh = new Date(now)
    if (currentHour >= 9) {
      nextDailyRefresh.setDate(nextDailyRefresh.getDate() + 1)
    }
    nextDailyRefresh.setHours(9, 0, 0, 0)
    
    // CPI：每月15日
    const nextCPIRefresh = new Date(now)
    if (now.getDate() >= 15) {
      nextCPIRefresh.setMonth(nextCPIRefresh.getMonth() + 1)
    }
    nextCPIRefresh.setDate(15)
    nextCPIRefresh.setHours(0, 0, 0, 0)
    
    const formatTime = (date: Date) => {
      const diff = date.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (hours > 24) {
        return `${Math.floor(hours / 24)}天后`
      }
      if (hours > 0) {
        return `${hours}小时${minutes}分钟后`
      }
      return `${minutes}分钟后`
    }
    
    // 判断当前黄金使用的数据源
    const isGoldAPITime = goldSchedule.some(h => Math.abs(currentHour - h) <= 1)
    
    setRefreshStatus({
      gold: { 
        nextRefresh: formatTime(nextGoldRefresh),
        source: isGoldAPITime ? 'GoldAPI' : 'Alpha Vantage'
      },
      us10y: { 
        nextRefresh: formatTime(nextDailyRefresh),
        source: 'FMP'
      },
      cpi: { 
        nextRefresh: formatTime(nextCPIRefresh),
        source: 'FRED'
      },
      brent: { 
        nextRefresh: formatTime(nextDailyRefresh),
        source: 'FRED'
      }
    })
  }, [])
  
  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }))
    calculateNextRefresh()
    
    // 每分钟更新一次刷新状态
    const interval = setInterval(calculateNextRefresh, 60000)
    return () => clearInterval(interval)
  }, [calculateNextRefresh])
  
  const handleRefresh = () => {
    setLastUpdate(new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }))
    calculateNextRefresh()
    onRefresh?.()
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Activity className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">宏观监控面板</h1>
              <p className="text-sm text-muted-foreground">专属每日实战版</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 py-1">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs">智能刷新</span>
              </Badge>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-right hidden md:flex items-center gap-2 cursor-help">
                    <div>
                      <div className="text-xs text-muted-foreground">最后更新</div>
                      <div className="text-sm font-medium tabular-nums">
                        {lastUpdate || '--:--:--'}
                      </div>
                    </div>
                    <Info className="size-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="w-72 p-3">
                  <div className="space-y-2">
                    <div className="font-medium text-sm mb-2 flex items-center gap-1.5">
                      <Clock className="size-4" />
                      智能刷新策略
                    </div>
                    {refreshStatus && (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">黄金 ({refreshStatus.gold.source})</span>
                          <span>{refreshStatus.gold.nextRefresh}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">国债 ({refreshStatus.us10y.source})</span>
                          <span>{refreshStatus.us10y.nextRefresh}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">原油 ({refreshStatus.brent.source})</span>
                          <span>{refreshStatus.brent.nextRefresh}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CPI ({refreshStatus.cpi.source})</span>
                          <span>{refreshStatus.cpi.nextRefresh}</span>
                        </div>
                        <div className="border-t border-border pt-1.5 mt-1.5 text-muted-foreground">
                          黄金定时刷新: 8:00, 13:00, 20:00
                          <br />
                          其他时间使用 Alpha Vantage 备用
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {extraActions}

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">刷新数据</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">登出</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
