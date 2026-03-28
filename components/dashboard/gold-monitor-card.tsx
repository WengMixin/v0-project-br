'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Minus, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

interface GoldDetails {
  spot: number | null
  futures: number | null
  spread: number | null
  spreadStatus: 'normal' | 'warning' | 'critical'
  spotSource: string
  isBackwardation: boolean
}

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
  
  const spread = goldDetails?.spread ?? (futuresPrice !== null ? futuresPrice - spotPrice : null)
  const isBackwardation = spread !== null && spread < 0
  const spreadStatus = goldDetails?.spreadStatus ?? (
    isBackwardation ? 'critical' : (spread !== null && spread < 5 ? 'warning' : 'normal')
  )
  
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'tiingo': return 'Tiingo'
      case 'goldapi': return 'GoldAPI'
      case 'yahoo_futures': return 'Yahoo期货'
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
              国际黄金 (XAUUSD)
              {isBackwardation && (
                <Badge variant="destructive" className="animate-pulse">
                  BACKWARDATION
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              现货价格为主，期货为辅
              {isLive !== undefined && (
                isLive ? (
                  <span className="flex items-center gap-1 text-success">
                    <Wifi className="size-3" /> {getSourceLabel(goldDetails?.spotSource || '')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-warning">
                    <WifiOff className="size-3" /> 备用
                  </span>
                )
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
            {/* 主要价格显示 - 现货 */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                ${spotPrice.toLocaleString('en-US', { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2 
                })}
              </span>
              <span className="text-sm text-muted-foreground">/盎司 (现货)</span>
            </div>
            
            {/* 涨跌幅 */}
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive && 'text-success',
              isNegative && 'text-danger',
              !isPositive && !isNegative && 'text-muted-foreground'
            )}>
              {isPositive && <TrendingUp className="size-4" />}
              {isNegative && <TrendingDown className="size-4" />}
              {!isPositive && !isNegative && <Minus className="size-4" />}
              <span>
                {isPositive ? '+' : ''}${change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
              </span>
            </div>
            
            {/* 现货 vs 期货 对比 */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-secondary/50">
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  现货 (XAUUSD)
                  <Wifi className="size-3 text-success" />
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  ${spotPrice.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  期货 (GC=F)
                  {futuresPrice !== null ? (
                    <Wifi className="size-3 text-success" />
                  ) : (
                    <WifiOff className="size-3 text-warning" />
                  )}
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {futuresPrice !== null ? `$${futuresPrice.toFixed(2)}` : '获取中...'}
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
                  <span className="text-sm font-medium">
                    期货-现货价差
                  </span>
                  <Badge variant={
                    spreadStatus === 'critical' ? 'destructive' :
                    spreadStatus === 'warning' ? 'outline' : 'secondary'
                  }>
                    {isBackwardation ? '贴水 (Backwardation)' : 
                     spreadStatus === 'warning' ? '价差收窄' : '升水 (Contango)'}
                  </Badge>
                </div>
                
                <div className={cn(
                  'text-2xl font-bold tabular-nums',
                  isBackwardation && 'text-danger',
                  spreadStatus === 'warning' && !isBackwardation && 'text-warning'
                )}>
                  {spread >= 0 ? '+' : ''}{spread.toFixed(2)} USD
                </div>
                
                {/* 状态解读 */}
                <div className="mt-3 pt-3 border-t border-border/50">
                  {isBackwardation ? (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="size-4 shrink-0 mt-0.5 text-danger" />
                      <div className="text-xs leading-relaxed">
                        <span className="font-semibold text-danger">极度危险信号!</span>
                        <span className="text-muted-foreground">
                          {' '}现货价格反超期货，说明全球央行和机构正在恐慌性抢购实物黄金。
                          美元信用体系可能正在发生断裂。建议：清空美股科技股，全仓黄金资产!
                        </span>
                      </div>
                    </div>
                  ) : spreadStatus === 'warning' ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="size-4 shrink-0 mt-0.5 text-warning" />
                      <div className="text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-warning">需要关注：</span>
                        {' '}期货-现货价差收窄至${spread.toFixed(2)}，正常应在$20-30。
                        价差持续收窄可能预示市场对实物黄金需求上升。
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-medium">正常状态：</span>
                      {' '}期货价格高于现货${spread.toFixed(2)}（包含利息成本），市场运行正常。
                      日常盯盘以现货价格为准，期货价格掺杂华尔街杠杆博弈噪音。
                    </div>
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
