'use client'

import { DashboardHeader } from '@/components/dashboard/header'
import { IndicatorCard } from '@/components/dashboard/indicator-card'
import { TreasuryAuctionCard } from '@/components/dashboard/treasury-auction-card'
import { FedStatementsCard } from '@/components/dashboard/fed-statements-card'
import { CPICard } from '@/components/dashboard/cpi-card'
import { StrategyTips } from '@/components/dashboard/strategy-tips'
import { DataSourcesPanel } from '@/components/dashboard/data-sources-panel'
import { GoldMonitorCard } from '@/components/dashboard/gold-monitor-card'
import { useMarketData, useTreasuryAuctions, useCPIData } from '@/hooks/use-market-data'
import {
  getCPIData,
  THRESHOLDS
} from '@/lib/market-data'
import type { CPIData } from '@/lib/market-data'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

export default function MacroMonitorDashboard() {
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null)
  
  useEffect(() => {
    setLastUpdateTime(new Date().toLocaleDateString('zh-CN', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }))
  }, [])
  const { data: marketData, isLoading, isError, refresh, isLive } = useMarketData()
  const { 
    auctions, 
    latestAuction, 
    evaluation: auctionEvaluation, 
    isLoading: auctionsLoading, 
    isLive: auctionsIsLive,
    refresh: refreshAuctions 
  } = useTreasuryAuctions()
  const { data: cpiDataLive, isLoading: cpiLoading, isLive: cpiIsLive, refresh: refreshCPI } = useCPIData()
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // 统一刷新所有数据
  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refresh(),
        refreshAuctions(),
        refreshCPI()
      ])
      setLastUpdateTime(new Date().toLocaleDateString('zh-CN', { 
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }))
    } finally {
      setIsRefreshing(false)
    }
}
  
  // 使用实时CPI数据或备用数据
  const fallbackCPI = getCPIData()
  const cpiData: CPIData = cpiDataLive ? {
    headline: cpiDataLive.headline ?? fallbackCPI.headline,
    core: cpiDataLive.core ?? fallbackCPI.core,
    coreMonthly: cpiDataLive.coreMonthly ?? fallbackCPI.coreMonthly,
    date: cpiDataLive.date || fallbackCPI.date,
    status: cpiDataLive.status || fallbackCPI.status
  } : fallbackCPI

  // 转换API数据为组件格式
  const formatIndicator = (
    name: string,
    data: { value: number; change: number; changePercent: number; lastUpdate: string } | undefined,
    thresholds?: { warning?: number; danger?: number }
  ) => {
    if (!data) {
      return {
        name,
        value: 0,
        change: 0,
        changePercent: 0,
        status: 'neutral' as const,
        lastUpdate: new Date()
      }
    }

    let status: 'bullish' | 'bearish' | 'neutral' | 'warning' | 'danger' = 'neutral'
    
    if (thresholds) {
      if (thresholds.danger && data.value >= thresholds.danger) {
        status = 'danger'
      } else if (thresholds.warning && data.value >= thresholds.warning) {
        status = 'warning'
      } else if (data.changePercent > 0.5) {
        status = 'bullish'
      } else if (data.changePercent < -0.5) {
        status = 'bearish'
      }
    } else {
      if (data.changePercent > 0.5) status = 'bullish'
      else if (data.changePercent < -0.5) status = 'bearish'
    }

    return {
      name,
      value: data.value ?? 0,
      change: data.change ?? 0,
      changePercent: data.changePercent ?? 0,
      status,
      lastUpdate: new Date(data.lastUpdate)
    }
  }

  // 生成简单的历史数据模拟（基于当前值）
  const generateChartData = (currentValue: number, volatility: number = 0.02) => {
    const data = []
    let value = currentValue * (1 - volatility * 3)
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      
      value = value + (Math.random() - 0.4) * currentValue * volatility
      data.push({ date: dateStr, value: Number(value.toFixed(2)) })
    }
    
    // 确保最后一个值是当前值
    if (data.length > 0) {
      data[data.length - 1].value = currentValue
    }
    
    return data
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onRefresh={handleRefreshAll} isRefreshing={isRefreshing} />
      
      <main className="container mx-auto px-4 py-6">
        {/* 数据状态指示器 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive ? (
              <div className="flex items-center gap-1.5 text-xs text-success">
                <Wifi className="size-3.5" />
                <span>实时数据</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-warning">
                <WifiOff className="size-3.5" />
                <span>备用数据</span>
              </div>
            )}
            {marketData?.timestamp && (
              <span className="text-xs text-muted-foreground">
                更新于 {new Date(marketData.timestamp).toLocaleTimeString('zh-CN')}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh()}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>

        {/* 错误提示 */}
        {isError && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="size-4" />
            <span>数据获取失败，显示备用数据</span>
          </div>
        )}

        {/* Section 1: 核心指标 */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">核心指标监控</h2>
            <span className="text-xs text-muted-foreground">盯死美国的钱袋子</span>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="size-8" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <IndicatorCard
                indicator={formatIndicator(
                  '美国10年期国债收益率',
                  marketData?.us10y,
                  { warning: THRESHOLDS.us10y.warning, danger: THRESHOLDS.us10y.danger }
                )}
                unit="%"
                thresholds={{
                  warning: THRESHOLDS.us10y.warning,
                  danger: THRESHOLDS.us10y.danger
                }}
                chartData={generateChartData(marketData?.us10y?.value || 4.39, 0.01)}
                description="突破4.5%进入警戒区，科技股���新能源继续杀估值"
              />
              
              <IndicatorCard
                indicator={formatIndicator(
                  '美元指数',
                  marketData?.dxy,
                  { warning: THRESHOLDS.dxy.high }
                )}
                unit=""
                thresholds={{
                  warning: THRESHOLDS.dxy.high
                }}
                chartData={generateChartData(marketData?.dxy?.value || 104.25, 0.005)}
                description="突破105说明全球极度缺钱，港股持续承压"
              />
              
              <IndicatorCard
                indicator={formatIndicator(
                  '布伦特原油',
                  marketData?.brent,
                  { warning: THRESHOLDS.brent.high, danger: THRESHOLDS.brent.veryHigh }
                )}
                unit="$/桶"
                thresholds={{
                  warning: THRESHOLDS.brent.high,
                  danger: THRESHOLDS.brent.veryHigh
                }}
                chartData={generateChartData(marketData?.brent?.value || 73.5, 0.02)}
                description="油价高企，中海油底仓坚决不动"
              />
              
              <GoldMonitorCard
                spotPrice={marketData?.gold?.value ?? 0}
                futuresPrice={marketData?.goldDetails?.futures ?? null}
                change={marketData?.gold?.change ?? 0}
                changePercent={marketData?.gold?.changePercent ?? 0}
                goldDetails={marketData?.goldDetails}
                isLoading={isLoading}
                isLive={marketData?.goldDetails !== undefined}
              />
            </div>
          )}
        </section>
        
        {/* Section 2: 国债拍卖 + 美联储口风 */}
        <section className="mb-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <TreasuryAuctionCard 
              auctions={auctions}
              latestAuction={latestAuction}
              evaluation={auctionEvaluation}
              isLoading={auctionsLoading}
              isLive={auctionsIsLive}
            />
            <FedStatementsCard />
          </div>
        </section>
        
        {/* Section 3: CPI数据 */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">通胀数据追踪</h2>
            <span className="text-xs text-muted-foreground">每月发布，重点标记日期</span>
          </div>
          
          <div className="grid gap-4 lg:grid-cols-2">
            <CPICard 
              data={cpiData} 
              nextReleaseDate={cpiDataLive?.nextReleaseDate}
              isLoading={cpiLoading}
              isLive={cpiIsLive}
            />
            
            {/* 市场情绪总结 */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">当前市场情绪总结</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-warning mt-2 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">利率环境</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      10Y收益率 {marketData?.us10y?.value?.toFixed(2) || '--'}% 
                      {marketData?.us10y?.value && marketData.us10y.value >= 4.5 
                        ? '处于警戒区间' 
                        : '处于观察区间'}，
                      市场预期美联储将维持 Higher for longer 立场。
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-success mt-2 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">大宗商品</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      原油 ${marketData?.brent?.value?.toFixed(2) || '--'}/桶 维持震荡，
                      黄�� ${marketData?.gold?.value?.toFixed(0) || '--'}/盎司 受益于避险情绪。
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">美元流动性</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      美元指数 {marketData?.dxy?.value?.toFixed(2) || '--'} 
                      {marketData?.dxy?.value && marketData.dxy.value >= 105 
                        ? '处于紧缩信号区' 
                        : '处于中性区间'}，
                      全球流动性暂未出现极端信号。
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-danger mt-2 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">通胀压力</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      核心CPI环比 {cpiData.coreMonthly}% 
                      {cpiData.coreMonthly >= 0.3 ? '超过警戒线' : '处于可控范围'}，
                      {cpiData.coreMonthly >= 0.4 ? '通胀黏性严重���美联储短期难以转向' : '关注后续数据变化'}。
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="font-medium text-sm text-warning mb-1">当前建议策略</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  维持高股息资产（神华、中海油、银行）防守配置，
                  科技股和新能源暂时观望。密切关注下一次国债拍卖结果和美联储讲话。
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Section 4: 策略速查 */}
        <section className="mb-8">
          <StrategyTips />
        </section>

        {/* Section 5: 数据源配置 */}
        <section className="mb-8">
          <DataSourcesPanel />
        </section>
        
        {/* Footer */}
        <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
          <p>数据仅供参考，不构成投资建议 · 投资有风险，入市需谨慎</p>
          <p className="mt-1">
            最后更新: {lastUpdateTime || '--'}
          </p>
        </footer>
      </main>
    </div>
  )
}
