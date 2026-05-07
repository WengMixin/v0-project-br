'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Landmark, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MacroIndicatorsPayload } from '@/hooks/use-market-data'

function formatFredValue(seriesId: string, value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  if (seriesId === 'UNRATE' || seriesId === 'DGS10') return `${value.toFixed(2)}%`
  if (seriesId === 'RRPONTSYD') return `$${value.toFixed(2)} bn`
  // WALCL / WRESBAL / WTREGEN: FRED 单位为百万美元 → 万亿美元
  const trillions = value / 1_000_000
  return `$${trillions.toFixed(2)}T`
}

interface Props {
  data: MacroIndicatorsPayload | undefined
  isLoading: boolean
  onRefresh: () => void
}

const ORDER = ['WALCL', 'WRESBAL', 'RRPONTSYD', 'WTREGEN', 'UNRATE', 'DGS10'] as const

export function MacroLiquidityCard({ data, isLoading, onRefresh }: Props) {
  const live = data?.success && !data.error

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Landmark className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">流动性与联储资产负债表</CardTitle>
              <CardDescription className="flex items-center gap-2">
                FRED：准备金 · ON RRP · TGA · 失业率 · 10Y；财政部 DTS 补充 TGA
                {live ? (
                  <span className="flex items-center gap-1 text-success text-xs">
                    <Wifi className="size-3" /> FRED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-warning text-xs">
                    <WifiOff className="size-3" /> 需 FRED_API_KEY
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : data?.error ? (
          <p className="text-sm text-muted-foreground">{data.error}</p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                    <th className="p-2 font-medium">指标</th>
                    <th className="p-2 font-medium">读数</th>
                    <th className="p-2 font-medium">环比</th>
                    <th className="p-2 font-medium">日期</th>
                  </tr>
                </thead>
                <tbody>
                  {ORDER.map((id) => {
                    const row = data?.series[id]
                    if (!row) return null
                    const pct = row.changePercent
                    return (
                      <tr key={id} className="border-b border-border/60 last:border-0">
                        <td className="p-2">
                          <span className="font-medium">{row.label}</span>
                          <div className="text-[10px] text-muted-foreground font-mono">{id}</div>
                        </td>
                        <td className="p-2 tabular-nums">{formatFredValue(id, row.value)}</td>
                        <td className="p-2">
                          {pct == null ? (
                            '—'
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                pct > 0.01 && 'border-danger/40 text-danger',
                                pct < -0.01 && 'border-success/40 text-success'
                              )}
                            >
                              {pct > 0 ? '+' : ''}
                              {pct.toFixed(2)}%
                            </Badge>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground whitespace-nowrap">{row.date ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {data?.treasury?.balanceDisplay && (
              <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs">
                <span className="font-medium">{data.treasury.label}</span>
                <span className="mx-2 tabular-nums text-primary">{data.treasury.balanceDisplay}</span>
                <span className="text-muted-foreground">（{data.treasury.recordDate} · fiscaldata.treasury.gov）</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
