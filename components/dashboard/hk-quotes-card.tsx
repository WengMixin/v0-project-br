'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { TrendingDown, TrendingUp, RefreshCw, LineChart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { HkQuotesPayload } from '@/hooks/use-market-data'

interface Props {
  data: HkQuotesPayload | undefined
  isLoading: boolean
  onRefresh: () => void
}

export function HkQuotesCard({ data, isLoading, onRefresh }: Props) {
  const rows = data?.quotes ?? []
  const yahooOk = data?.source === 'yahoo' && data.success

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <LineChart className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">港股观察清单</CardTitle>
              <CardDescription className="text-xs">
                默认经 Yahoo 批量报价；可设环境变量 HK_YAHOO_SYMBOLS 覆盖代码
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
        ) : (
          <>
            {!yahooOk && data?.hint && (
              <p className="text-xs text-warning mb-3 rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5">
                {data.hint}
              </p>
            )}
            <div className="space-y-2">
              {rows.map((q) => (
                <div
                  key={q.symbol}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{q.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{q.symbol}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="tabular-nums font-semibold">
                      {q.price != null ? `${q.price.toFixed(2)}` : '—'}
                    </div>
                    {q.changePercent != null && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-0.5 text-[10px] h-5',
                          q.changePercent > 0 && 'text-danger border-danger/30',
                          q.changePercent < 0 && 'text-success border-success/30'
                        )}
                      >
                        {q.changePercent > 0 ? <TrendingUp className="size-3 inline mr-0.5" /> : null}
                        {q.changePercent < 0 ? <TrendingDown className="size-3 inline mr-0.5" /> : null}
                        {q.changePercent > 0 ? '+' : ''}
                        {q.changePercent.toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
