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
  
  // 优先使用goldDetails中的数据
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
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-danger animate-pulse" />
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              国际黄金
              {isBackwardation && (
                <Badge variant="destructive" className="animate-pulse">
                  BACKWARDATION
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              现货为主，期货为辅
              {isLive && (
                <span className="flex items-center gap-1 text-success">
                  <Wifi className="size-3" /> {getSourceLabel(goldDetails?.spotSource)}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 现货 vs 期货 并排显示 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 现货价格 */}
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  现货 XAUUSD
                  <Wifi className="size-3 text-success" />
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  ${spotPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium mt-1',
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
              
              {/* 期货价格 */}
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  期货 GC=F
                  {actualFuturesPrice !== null ? (
                    <Wifi className="size-3 text-success" />
                  ) : (
                    <WifiOff className="size-3 text-warning" />
                  )}
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {actualFuturesPrice !== null 
                    ? `$${actualFuturesPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '获取中...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  华尔街杠杆博弈
                </div>
              </div>
            </div>
            
            {/* 价差分析 */}
            {spread !== null && (
              <div className={cn(
                'p-3 rounded-lg border',
                spreadStatus === 'critical' && 'bg-danger/10 border-danger/30',
                spreadStatus === 'warning' && 'bg-warning/10 border-warning/30',
                spreadStatus === 'normal' && 'bg-secondary/30 border-border'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">期货-现货价差</span>
                  <Badge variant={
                    spreadStatus === 'critical' ? 'destructive' :
                    spreadStatus === 'warning' ? 'outline' : 'secondary'
                  }>
                    {isBackwardation ? '贴水 Backwardation' : 
                     spreadStatus === 'warning' ? '价差收窄' : '升水 Contango'}
                  </Badge>
                </div>
                
                <div className={cn(
                  'text-xl font-bold tabular-nums',
                  isBackwardation && 'text-danger',
                  spreadStatus === 'warning' && !isBackwardation && 'text-warning'
                )}>
                  {spread >= 0 ? '+' : ''}{spread.toFixed(2)} USD
                </div>
                
                {/* 状态解读 */}
                <div className="mt-2 pt-2 border-t border-border/50">
                  {isBackwardation ? (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="size-4 shrink-0 mt-0.5 text-danger" />
                      <p className="text-xs leading-relaxed">
                        <span className="font-semibold text-danger">极度危险!</span>
                        <span className="text-muted-foreground">
                          {' '}现货反超期货，全球央行恐慌抢购实物黄金。美元信用崩塌信号，建议清空美股科技股，全仓黄金!
                        </span>
                      </p>
                    </div>
                  ) : spreadStatus === 'warning' ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="size-4 shrink-0 mt-0.5 text-warning" />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-warning">关注:</span>
                        {' '}价差收窄至${spread.toFixed(2)}(正常$20-30)，实物需求上升信号。
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      正常升水${spread.toFixed(2)}(利息成本)。日常盯盘看现货，期货含杠杆噪音。
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
