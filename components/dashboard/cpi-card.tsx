'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, AlertTriangle, Calendar, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CPIData } from '@/lib/market-data'
import { THRESHOLDS } from '@/lib/market-data'
import { Spinner } from '@/components/ui/spinner'

interface CPICardProps {
  data: CPIData
  nextReleaseDate?: string
  isLoading?: boolean
  isLive?: boolean
}

export function CPICard({ data, nextReleaseDate = '2026-04-10', isLoading, isLive }: CPICardProps) {
  const getStatusStyle = (status: CPIData['status']) => {
    switch (status) {
      case 'high':
        return 'bg-danger/20 text-danger border-danger/30'
      case 'moderate':
        return 'bg-warning/20 text-warning border-warning/30'
      default:
        return 'bg-success/20 text-success border-success/30'
    }
  }
  
  const getStatusLabel = (status: CPIData['status']) => {
    switch (status) {
      case 'high':
        return '通胀偏高'
      case 'moderate':
        return '通胀温和'
      default:
        return '通胀可控'
    }
  }
  
  const isCoreMonthlHigh = data.coreMonthly >= THRESHOLDS.coreCPI.veryHigh
  const isCoreMonthlWarning = data.coreMonthly >= THRESHOLDS.coreCPI.high && !isCoreMonthlHigh

  const renderDataSourceBadge = () => {
    if (isLive === undefined) return null
    if (isLive) {
      return (
        <span className="flex items-center gap-1 text-success">
          <Wifi className="size-3" />
          <span>FRED</span>
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-warning">
        <WifiOff className="size-3" />
        <span>备用</span>
      </span>
    )
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Spinner className="size-6" />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <div className="text-xs text-muted-foreground mb-1">整体 CPI</div>
            <div className="text-2xl font-bold tabular-nums">{data.headline}%</div>
            <div className="text-xs text-muted-foreground">同比</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <div className="text-xs text-muted-foreground mb-1">核心 CPI</div>
            <div className="text-2xl font-bold tabular-nums">{data.core}%</div>
            <div className="text-xs text-muted-foreground">同比</div>
          </div>
          
          <div className={cn(
            'text-center p-3 rounded-lg',
            isCoreMonthlHigh ? 'bg-danger/20 border border-danger/30' :
            isCoreMonthlWarning ? 'bg-warning/20 border border-warning/30' :
            'bg-secondary/50'
          )}>
            <div className="text-xs text-muted-foreground mb-1">核心 CPI</div>
            <div className={cn(
              'text-2xl font-bold tabular-nums',
              isCoreMonthlHigh && 'text-danger',
              isCoreMonthlWarning && 'text-warning'
            )}>
              {data.coreMonthly}%
            </div>
            <div className="text-xs text-muted-foreground">环比</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 border border-border">
          <Calendar className="size-4 text-primary shrink-0" />
          <div className="text-xs">
            <span className="text-muted-foreground">上次发布: </span>
            <span className="font-medium">{data.date}</span>
            <span className="text-muted-foreground"> · 下次发布: </span>
            <span className="font-medium text-primary">{nextReleaseDate}</span>
          </div>
        </div>
        
        {(isCoreMonthlHigh || isCoreMonthlWarning) && (
          <div className={cn(
            'p-3 rounded-lg border',
            isCoreMonthlHigh ? 'bg-danger/10 border-danger/20' : 'bg-warning/10 border-warning/20'
          )}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={cn(
                'size-4 shrink-0 mt-0.5',
                isCoreMonthlHigh ? 'text-danger' : 'text-warning'
              )} />
              <div className="text-xs leading-relaxed">
                <span className={cn(
                  'font-medium',
                  isCoreMonthlHigh ? 'text-danger' : 'text-warning'
                )}>
                  {isCoreMonthlHigh ? '高度警戒：' : '需要关注：'}
                </span>
                <span className="text-muted-foreground">
                  {"核心CPI环比 " + data.coreMonthly + "% "}
                  {isCoreMonthlHigh 
                    ? "超过 " + THRESHOLDS.coreCPI.veryHigh + "%，说明通胀已深入服务业，美联储短期内绝对不敢降息。保持高股息资产防守！"
                    : "接近警戒线 " + THRESHOLDS.coreCPI.veryHigh + "%，需密切关注后续数据。"
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">核心通胀数据</CardTitle>
              <CardDescription className="flex items-center gap-2">
                美联储最看重的指标
                {renderDataSourceBadge()}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-xs', getStatusStyle(data.status))}>
            {getStatusLabel(data.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  )
}
