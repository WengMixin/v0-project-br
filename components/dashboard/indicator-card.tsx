'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarketIndicator } from '@/lib/market-data'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from 'recharts'

interface IndicatorCardProps {
  indicator: MarketIndicator
  unit?: string
  thresholds?: {
    warning?: number
    danger?: number
  }
  chartData?: { date: string; value: number }[]
  description?: string
}

export function IndicatorCard({
  indicator,
  unit = '',
  thresholds,
  chartData,
  description
}: IndicatorCardProps) {
  // 安全处理可能为null的值
  const value = indicator.value ?? 0
  const change = indicator.change ?? 0
  const changePercent = indicator.changePercent ?? 0
  
  const isPositive = change > 0
  const isNegative = change < 0
  
  const getStatusColor = (status: MarketIndicator['status']) => {
    switch (status) {
      case 'bullish':
        return 'bg-success/20 text-success border-success/30'
      case 'bearish':
        return 'bg-danger/20 text-danger border-danger/30'
      case 'warning':
        return 'bg-warning/20 text-warning border-warning/30'
      case 'danger':
        return 'bg-danger/20 text-danger border-danger/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }
  
  const getStatusLabel = (status: MarketIndicator['status']) => {
    switch (status) {
      case 'bullish':
        return '看涨'
      case 'bearish':
        return '看跌'
      case 'warning':
        return '警戒'
      case 'danger':
        return '危险'
      default:
        return '中性'
    }
  }
  
  const getChartColor = (status: MarketIndicator['status']) => {
    switch (status) {
      case 'bullish':
        return 'var(--success)'
      case 'bearish':
      case 'danger':
        return 'var(--danger)'
      case 'warning':
        return 'var(--warning)'
      default:
        return 'var(--primary)'
    }
  }

  const showWarning = thresholds?.warning && value >= thresholds.warning
  const showDanger = thresholds?.danger && value >= thresholds.danger

  return (
    <Card className="relative overflow-hidden">
      {showDanger && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-danger" />
      )}
      {showWarning && !showDanger && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-warning" />
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {indicator.name}
          </CardTitle>
          <Badge variant="outline" className={cn('text-xs', getStatusColor(indicator.status))}>
            {getStatusLabel(indicator.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {value.toLocaleString('zh-CN', { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        
        <div className="flex items-center gap-2">
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
              {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        
        {chartData && chartData.length > 0 && (
          <div className="h-16 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${indicator.name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={getChartColor(indicator.status)} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={getChartColor(indicator.status)} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} hide />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={getChartColor(indicator.status)}
                  strokeWidth={2}
                  fill={`url(#gradient-${indicator.name})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {thresholds && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
            {thresholds.warning && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="size-3 text-warning" />
                <span>警戒: {thresholds.warning}</span>
              </div>
            )}
            {thresholds.danger && (
              <div className="flex items-center gap-1">
                <AlertCircle className="size-3 text-danger" />
                <span>危险: {thresholds.danger}</span>
              </div>
            )}
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
