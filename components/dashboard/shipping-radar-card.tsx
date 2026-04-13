'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Anchor, RefreshCw, TrendingDown, TrendingUp, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShippingDataPayload } from '@/lib/shipping-data'

interface ShippingRadarCardProps {
  data: ShippingDataPayload | undefined
  isLoading: boolean
  isError: boolean
  onRefresh: () => void
}

function sourceLabel(source: ShippingDataPayload['bdti']['source']) {
  switch (source) {
    case 'tradingeconomics_api':
      return 'Trading Economics API'
    case 'tradingeconomics_html':
      return 'Trading Economics (页面)'
    case 'manual_env':
      return '手动 BDTI_MANUAL_VALUE'
    default:
      return '—'
  }
}

export function ShippingRadarCard({ data, isLoading, isError, onRefresh }: ShippingRadarCardProps) {
  const b = data?.bdti
  const r = data?.brent
  const a = data?.alerts

  const spreadLabel =
    r?.spreadUsd === null || r?.spreadUsd === undefined
      ? '—'
      : `${r.spreadUsd >= 0 ? '+' : ''}${r.spreadUsd.toFixed(2)} $/桶`

  return (
    <Card className={cn(a?.hecnTakeProfitHint && 'border-warning')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Anchor className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">油运雷达 · BDTI & 布伦特期现</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                中远海能等 VLCC 敞口参考
                {data?.success ? (
                  <span className="flex items-center gap-1 text-success">
                    <Wifi className="size-3" /> 布伦特期现已齐套
                  </span>
                ) : data ? (
                  <span className="flex items-center gap-1 text-warning">
                    <WifiOff className="size-3" /> 布伦特数据不完整
                  </span>
                ) : null}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => onRefresh()} disabled={isLoading}>
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : isError ? (
          <p className="text-center text-sm text-muted-foreground py-6">加载失败，请稍后重试</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="text-xs text-muted-foreground mb-1">BDTI（波罗的海原油运价指数）</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {b?.value != null ? b.value.toFixed(0) : '—'}
                  </span>
                  {b?.dailyChangePercent != null && (
                    <span
                      className={cn(
                        'text-xs font-medium flex items-center gap-0.5',
                        b.dailyChangePercent < 0 ? 'text-success' : b.dailyChangePercent > 0 ? 'text-danger' : 'text-muted-foreground'
                      )}
                    >
                      {b.dailyChangePercent < 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
                      {b.dailyChangePercent > 0 ? '+' : ''}
                      {b.dailyChangePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">来源：{b ? sourceLabel(b.source) : '—'}</p>
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="text-xs text-muted-foreground mb-1">布伦特：现货(FRED) − 期货(Yahoo BZ=F)</div>
                <div className="text-2xl font-bold tabular-nums">{spreadLabel}</div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  现货 {r?.spotUsd != null ? `$${r.spotUsd.toFixed(2)}` : '—'}（{r?.spotDate ?? '—'}）· 期货{' '}
                  {r?.futuresUsd != null ? `$${r.futuresUsd.toFixed(2)}` : '—'}
                </p>
                {r?.isBackwardation === true && (
                  <Badge variant="outline" className="mt-2 text-xs border-danger/40 text-danger">
                    现货溢价（backwardation）
                  </Badge>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">条件扫描（实验性）</div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li className={cn(a?.bdtiTwoDayCrash && 'text-warning font-medium')}>
                  {a?.bdtiTwoDayCrash ? '●' : '○'} BDTI 连续两日跌幅 ≥ {a?.bdtiCrashThresholdPercent ?? 5}%（需 FRED 配置 BDTI_FRED_SERIES）
                </li>
                <li className={cn(a?.bdtiTodayWeak && 'text-warning font-medium')}>
                  {a?.bdtiTodayWeak ? '●' : '○'} 当日 BDTI 跌幅 ≤ −3%
                </li>
                <li className={cn(a?.spreadTightUsd && 'text-warning font-medium')}>
                  {a?.spreadTightUsd ? '●' : '○'} 期现价差处于偏紧区间（现货溢价显著收敛）
                </li>
              </ul>
              {a?.hecnTakeProfitHint && (
                <div className="flex gap-2 items-start rounded-md bg-warning/15 border border-warning/30 p-2 text-xs text-warning">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>组合触发：运价急跌 + 现货紧张度回落 — 请结合自身仓位与基本面核对，不构成投资建议。</span>
                </div>
              )}
            </div>

            {data?.errors && data.errors.length > 0 && (
              <div className="text-[10px] text-muted-foreground border-t border-border pt-2 space-y-0.5">
                {data.errors.slice(0, 4).map((msg, i) => (
                  <div key={i}>{msg}</div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
