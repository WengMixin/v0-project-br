'use client'

import { Badge } from '@/components/ui/badge'
import { Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

export function DashboardHeader() {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // 在客户端挂载后才设置时间，避免水合不匹配
  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }))
  }, [])
  
  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setLastUpdate(new Date().toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }))
      setIsRefreshing(false)
    }, 1000)
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
                <span className="text-xs">实时监控</span>
              </Badge>
            </div>
            
            <div className="text-right hidden md:block">
              <div className="text-xs text-muted-foreground">最后更新</div>
              <div className="text-sm font-medium tabular-nums">
                {lastUpdate || '--:--:--'}
              </div>
            </div>
            
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
          </div>
        </div>
      </div>
    </header>
  )
}
