'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gavel, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff, TrendingDown, TrendingUp, Building2 } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type AlertLevel = 'NORMAL' | 'WARNING' | 'CRITICAL'

interface TreasuryAuction {
  date: string
  type: string
  bidToCover: number
  rate: number | null
  dealerRatio: number | null
  directRatio?: number | null
  indirectRatio?: number | null
  status: 'normal' | 'weak' | 'danger'
  alertLevel: AlertLevel
  tail?: number
}

interface AuctionEvaluation {
  alertLevel: AlertLevel
  status: string
  action: string
}

interface LatestAuction {
  auctionDate: string
  securityTerm: string
  bidToCover?: number
  highYield?: number | null
  dealerRatio?: number
  directRatio?: number
  indirectRatio?: number
  dataAvailable: boolean
}

interface TreasuryAuctionCardProps {
  auctions: TreasuryAuction[]
  latestAuction?: LatestAuction | null
  evaluation?: AuctionEvaluation | null
  isLoading?: boolean
  isLive?: boolean
}

export function TreasuryAuctionCard({ 
  auctions, 
  latestAuction, 
  evaluation, 
  isLoading, 
  isLive 
}: TreasuryAuctionCardProps) {
  
  const getAlertBgColor = (level: AlertLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-danger/20 border-danger'
      case 'WARNING':
        return 'bg-warning/20 border-warning'
      default:
        return 'bg-success/20 border-success'
    }
  }
  
  const getAlertTextColor = (level: AlertLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-danger'
      case 'WARNING':
        return 'text-warning'
      default:
        return 'text-success'
    }
  }
  
  const getStatusIcon = (level: AlertLevel) => {
    switch (level) {
      case 'CRITICAL':
        return <XCircle className="size-5" />
      case 'WARNING':
        return <AlertTriangle className="size-5" />
      default:
        return <CheckCircle className="size-5" />
    }
  }
  
  const getBidToCoverColor = (ratio: number) => {
    if (ratio < 2.0) return 'text-danger'
    if (ratio < 2.3) return 'text-warning'
    return 'text-success'
  }
  
  const getDealerRatioColor = (ratio: number) => {
    if (ratio > 20) return 'text-danger'
    if (ratio > 15) return 'text-warning'
    return 'text-success'
  }

  const renderLatestAuctionPanel = () => {
    if (!latestAuction?.dataAvailable || !evaluation) return null
    
    return (
      <div className={cn(
        'p-4 rounded-lg border-2 mb-4',
        getAlertBgColor(evaluation.alertLevel)
      )}>
        <div className="flex items-center gap-2 mb-3">
          <span className={getAlertTextColor(evaluation.alertLevel)}>
            {getStatusIcon(evaluation.alertLevel)}
          </span>
          <h3 className={cn('font-bold text-lg', getAlertTextColor(evaluation.alertLevel))}>
            {evaluation.status}
          </h3>
        </div>
        
        {/* 核心指标网格 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="size-3" /> 投标倍数 (需求)
            </div>
            <div className={cn(
              'text-2xl font-black tabular-nums',
              getBidToCoverColor(latestAuction.bidToCover ?? 0)
            )}>
              {latestAuction.bidToCover?.toFixed(2) ?? 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">
              {(latestAuction.bidToCover ?? 0) < 2.3 ? '需求偏弱' : '需求健康'}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="size-3" /> 华尔街接盘率
            </div>
            <div className={cn(
              'text-2xl font-black tabular-nums',
              getDealerRatioColor(latestAuction.dealerRatio ?? 0)
            )}>
              {latestAuction.dealerRatio?.toFixed(1) ?? 'N/A'}%
            </div>
            <div className="text-xs text-muted-foreground">
              {(latestAuction.dealerRatio ?? 0) > 15 ? '被迫吃进' : '正常分销'}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="size-3" /> 最高收益率
            </div>
            <div className="text-2xl font-black tabular-nums text-foreground">
              {latestAuction.highYield?.toFixed(2) ?? 'N/A'}%
            </div>
            <div className="text-xs text-muted-foreground">
              {latestAuction.securityTerm} ({latestAuction.auctionDate})
            </div>
          </div>
        </div>
        
        {/* 买家结构分析 */}
        {latestAuction.directRatio !== undefined && latestAuction.indirectRatio !== undefined && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">买家结构分析</div>
            <div className="flex h-3 rounded-full overflow-hidden bg-background/50">
              <div 
                className="bg-primary/80" 
                style={{ width: `${latestAuction.indirectRatio}%` }}
                title={`海外央行/机构: ${latestAuction.indirectRatio.toFixed(1)}%`}
              />
              <div 
                className="bg-success/80" 
                style={{ width: `${latestAuction.directRatio}%` }}
                title={`直接买家: ${latestAuction.directRatio.toFixed(1)}%`}
              />
              <div 
                className={cn(
                  (latestAuction.dealerRatio ?? 0) > 15 ? 'bg-warning/80' : 'bg-muted-foreground/50'
                )}
                style={{ width: `${latestAuction.dealerRatio}%` }}
                title={`一级交易商: ${latestAuction.dealerRatio?.toFixed(1)}%`}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>海外央行 {latestAuction.indirectRatio?.toFixed(1)}%</span>
              <span>直接买家 {latestAuction.directRatio?.toFixed(1)}%</span>
              <span>交易商 {latestAuction.dealerRatio?.toFixed(1)}%</span>
            </div>
          </div>
        )}
        
        {/* 操作建议 */}
        <div className={cn(
          'p-3 rounded-lg border',
          evaluation.alertLevel === 'CRITICAL' ? 'bg-danger/10 border-danger/30' :
          evaluation.alertLevel === 'WARNING' ? 'bg-warning/10 border-warning/30' :
          'bg-success/10 border-success/30'
        )}>
          <div className="text-sm font-medium">操作建议</div>
          <div className="text-sm mt-1">{evaluation.action}</div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex size-8 items-center justify-center rounded-lg',
            evaluation?.alertLevel === 'CRITICAL' ? 'bg-danger/20' :
            evaluation?.alertLevel === 'WARNING' ? 'bg-warning/20' :
            'bg-primary/10'
          )}>
            <Gavel className={cn(
              'size-4',
              evaluation?.alertLevel === 'CRITICAL' ? 'text-danger' :
              evaluation?.alertLevel === 'WARNING' ? 'text-warning' :
              'text-primary'
            )} />
          </div>
          <div>
            <CardTitle className="text-base">美债核爆监控雷达</CardTitle>
            <CardDescription className="flex items-center gap-2">
              10年期国债拍卖 - 华尔街接盘监控
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
        ) : (
          <>
            {/* 最新拍卖警报面板 */}
            {renderLatestAuctionPanel()}
            
            {/* 历史拍卖列表 */}
            {auctions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                暂无拍卖数据
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-2">近期拍卖记录</div>
                {auctions.slice(0, 5).map((auction, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg text-sm',
                      auction.alertLevel === 'CRITICAL' && 'bg-danger/10 border border-danger/20',
                      auction.alertLevel === 'WARNING' && 'bg-warning/10 border border-warning/20',
                      auction.alertLevel === 'NORMAL' && 'bg-secondary/50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={getAlertTextColor(auction.alertLevel)}>
                        {getStatusIcon(auction.alertLevel)}
                      </span>
                      <div>
                        <div className="font-medium">{auction.date}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-xs text-muted-foreground">投标倍数</div>
                        <div className={cn('font-semibold tabular-nums', getBidToCoverColor(auction.bidToCover))}>
                          {auction.bidToCover.toFixed(2)}x
                        </div>
                      </div>
                      {auction.dealerRatio !== null && (
                        <div>
                          <div className="text-xs text-muted-foreground">接盘率</div>
                          <div className={cn('font-semibold tabular-nums', getDealerRatioColor(auction.dealerRatio))}>
                            {auction.dealerRatio.toFixed(1)}%
                          </div>
                        </div>
                      )}
                      {auction.rate !== null && (
                        <div>
                          <div className="text-xs text-muted-foreground">收益率</div>
                          <div className="font-semibold tabular-nums text-muted-foreground">
                            {auction.rate.toFixed(2)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 判定规则说明 */}
            <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-border">
              <div className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">核爆判定规则：</span>
                <span className="text-danger"> 投标倍数 &lt; 2.0 或 接盘率 &gt; 20%</span> = 核爆警告；
                <span className="text-warning"> 投标倍数 &lt; 2.3 或 接盘率 &gt; 15%</span> = 警戒提示。
                华尔街被迫接盘比例越高，说明市场真实需求越弱，美债危机越近！
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
