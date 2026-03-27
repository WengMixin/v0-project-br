'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gavel, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { TreasuryAuction } from '@/lib/market-data'
import { THRESHOLDS } from '@/lib/market-data'

interface TreasuryAuctionCardProps {
  auctions: TreasuryAuction[]
  isLoading?: boolean
  isLive?: boolean
}

export function TreasuryAuctionCard({ auctions, isLoading, isLive }: TreasuryAuctionCardProps) {
  const getStatusIcon = (status: TreasuryAuction['status']) => {
    switch (status) {
      case 'danger':
        return <XCircle className="size-4 text-danger" />
      case 'weak':
        return <AlertTriangle className="size-4 text-warning" />
      default:
        return <CheckCircle className="size-4 text-success" />
    }
  }
  
  const getStatusLabel = (status: TreasuryAuction['status']) => {
    switch (status) {
      case 'danger':
        return '需求疲软'
      case 'weak':
        return '略显疲态'
      default:
        return '需求正常'
    }
  }
  
  const getBidToCoverColor = (ratio: number) => {
    if (ratio < THRESHOLDS.bidToCover.danger) return 'text-danger'
    if (ratio < THRESHOLDS.bidToCover.warning) return 'text-warning'
    return 'text-success'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Gavel className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">国债拍卖监控</CardTitle>
            <CardDescription className="flex items-center gap-2">
              关注投标倍数与尾部利差
              {isLive !== undefined && (
                isLive ? (
                  <span className="flex items-center gap-1 text-success">
                    <Wifi className="size-3" /> 实时
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
        ) : auctions.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            暂无拍卖数据
          </div>
        ) : (
        <div className="space-y-4">
          {auctions.map((auction, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg bg-secondary/50',
                auction.status === 'danger' && 'bg-danger/10 border border-danger/20',
                auction.status === 'weak' && 'bg-warning/10 border border-warning/20'
              )}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(auction.status)}
                <div>
                  <div className="font-medium text-sm">{auction.type}</div>
                  <div className="text-xs text-muted-foreground">{auction.date}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-xs text-muted-foreground">投标倍数</div>
                  <div className={cn('font-semibold tabular-nums', getBidToCoverColor(auction.bidToCover))}>
                    {auction.bidToCover.toFixed(2)}x
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">尾部利差</div>
                  <div className={cn(
                    'font-semibold tabular-nums',
                    auction.tail > 1.5 ? 'text-danger' : auction.tail > 1 ? 'text-warning' : 'text-muted-foreground'
                  )}>
                    {auction.tail.toFixed(1)} bp
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
        
        <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-border">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">爆雷信号：</span>
              如果投标倍数低于 {THRESHOLDS.bidToCover.danger}x 或尾部利差超过 2bp，说明银行不买账。
              这是 YCC（无限量印钞）即将被迫出台的最强前兆，准备满仓干黄金！
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
