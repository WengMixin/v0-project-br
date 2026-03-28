'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Minus, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import type { GoldDetails } from '@/hooks/use-market-data'

interface GoldMonitorCardProps {
  spotPrice: number
  futuresPrice: number | null
  change: number
  changePercent: number
  goldDetails?: GoldDetails
  isLoading?: boolean
  isLive?: boolean
}

export function GoldMonitorCard({
  spotPrice,
  futuresPrice,
  change,
  changePercent,
  goldDetails,
  isLoading,
  isLive
}: GoldMonitorCardProps) {
  const isPositive = change > 0
  const isNegative = change < 0
  
  const actualFuturesPrice = goldDetails?.futures ?? futuresPrice
  const spread = goldDetails?.spread ?? (actualFuturesPrice !== null ? actualFuturesPrice - spotPrice : null)
  const isBackwardation = goldDetails?.isBackwardation ?? (spread !== null && spread < 0)
  const spreadStatus = goldDetails?.spreadStatus ?? (
    isBackwardation ? 'critical' : (spread !== null && spread < 5 ? 'warning' : 'normal')
  )
  
  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'tiingo': return 'Tiingo'
      case 'goldapi': return 'GoldAPI'
      case 'yahoo_futures': return 'Yahoo'
      default: return '备用'
    }
  }
  
  return (
    <Card className={cn(
      'relative overflow-hidden',
      isBackwardation && 'border-danger bg-danger/5'
    )}>
      {isBackwardation && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-danger animate-pulse" />
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            国际黄金
            {isBackwardation && (
              <Badge variant="destructive" className="animate-pulse text-xs">
                危机
              </Badge>
            )}
          </CardTitle>
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-success">
              <Wifi className="size-3" /> {getSourceLabel(goldDetails?.spotSource)}
            </span>
          )}
        </div>
        <CardDescription>现货为主，期货为辅</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner className="size-5" />
          </div>
        ) : (
          <>
            {/* 现货价格 - 主要显示 */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  现货 XAUUSD
                  <Wifi className="size-2.5 text-success" />
                </span>
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  isPositive && 'text-success',
                  isNegative && 'text-danger',
                  !isPositive && !isNegative && 'text-muted-foreground'
                )}>
                  {isPositive && <TrendingUp className="size-3" />}
                  {isNegative && <TrendingDown className="size-3" />}
                  {!isPositive && !isNegative && <Minus className="size-3" />}
                  <span>{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
                </div>
              </div>
              <div className="text-3xl font-bold tabular-nums text-primary">
                ${spotPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">全球真实供需</p>
            </div>
            
            {/* 期货价格 + 价差 */}
            <div className="flex gap-3">
              {/* 期货 */}
              <div className="flex-1 p-2.5 rounded-lg bg-secondary/50">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  期货 GC=F
                  {actualFuturesPrice !== null ? (
                    <Wifi className="size-2.5 text-success" />
                  ) : (
                    <WifiOff className="size-2.5 text-warning" />
                  )}
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {actualFuturesPrice !== null 
                    ? `$${actualFuturesPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '...'}
                </div>
              </div>
              
              {/* 价差 */}
              {spread !== null && (
                <div className={cn(
                  'flex-1 p-2.5 rounded-lg',
                  spreadStatus === 'critical' && 'bg-danger/10',
                  spreadStatus === 'warning' && 'bg-warning/10',
                  spreadStatus === 'normal' && 'bg-secondary/50'
                )}>
                  <div className="text-xs text-muted-foreground mb-1">价差</div>
                  <div className={cn(
                    'text-lg font-semibold tabular-nums',
                    spreadStatus === 'critical' && 'text-danger',
                    spreadStatus === 'warning' && 'text-warning'
                  )}>
                    {spread >= 0 ? '+' : ''}{spread.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
            
            {/* 状态提示 */}
            {spread !== null && (
              <div className={cn(
                'p-2.5 rounded-lg text-xs',
                spreadStatus === 'critical' && 'bg-danger/10 border border-danger/20',
                spreadStatus === 'warning' && 'bg-warning/10 border border-warning/20',
                spreadStatus === 'normal' && 'bg-muted/30'
              )}>
                {isBackwardation ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-danger" />
                    <p className="leading-relaxed">
                      <span className="font-semibold text-danger">贴水警报!</span>
                      <span className="text-muted-foreground"> 现货反超期货，央行抢购实物。清空科技股，全仓黄金!</span>
                    </p>
                  </div>
                ) : spreadStatus === 'warning' ? (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-warning" />
                    <p className="text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-warning">价差收窄</span> 至${spread.toFixed(0)}(正常$20-30)，实物需求上升。
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    正常升水${spread.toFixed(0)}。日常盯现货，期货含杠杆噪音。
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
