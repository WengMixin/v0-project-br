'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Rss, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FedPressRssPayload } from '@/hooks/use-market-data'

interface Props {
  data: FedPressRssPayload | undefined
  isLoading: boolean
  onRefresh: () => void
}

export function FedPressRssCard({ data, isLoading, onRefresh }: Props) {
  const items = data?.items ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Rss className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">美联储新闻稿 RSS</CardTitle>
              <CardDescription className="text-xs">政策与发布节奏提醒（非结构化数值）</CardDescription>
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
          <p className="text-sm text-destructive">{data.error}</p>
        ) : (
          <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {items.map((it, i) => (
              <li key={i} className="text-xs border-b border-border/50 pb-2 last:border-0">
                <a
                  href={it.link.startsWith('http') ? it.link : `https://www.federalreserve.gov${it.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-primary flex items-start gap-1 group"
                >
                  <span className="flex-1 leading-snug">{it.title}</span>
                  <ExternalLink className="size-3 shrink-0 opacity-50 group-hover:opacity-100 mt-0.5" />
                </a>
                {it.pubDate && <div className="text-[10px] text-muted-foreground mt-1">{it.pubDate}</div>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
