'use client'

import { DashboardHeader } from '@/components/dashboard/header'
import { IndicatorCard } from '@/components/dashboard/indicator-card'
import { TreasuryAuctionCard } from '@/components/dashboard/treasury-auction-card'
import { FedStatementsCard } from '@/components/dashboard/fed-statements-card'
import { CPICard } from '@/components/dashboard/cpi-card'
import { StrategyTips } from '@/components/dashboard/strategy-tips'
import {
  getMarketData,
  getTreasuryAuctions,
  getFedStatements,
  getCPIData,
  getUS10YHistory,
  getDXYHistory,
  getBrentHistory,
  getGoldHistory,
  THRESHOLDS
} from '@/lib/market-data'

export default function MacroMonitorDashboard() {
  const marketData = getMarketData()
  const treasuryAuctions = getTreasuryAuctions()
  const fedStatements = getFedStatements()
  const cpiData = getCPIData()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6">
        {/* Section 1: 核心指标 */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">核心指标监控</h2>
            <span className="text-xs text-muted-foreground">盯死美国的钱袋子</span>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IndicatorCard
              indicator={marketData.us10y}
              unit="%"
              thresholds={{
                warning: THRESHOLDS.us10y.warning,
                danger: THRESHOLDS.us10y.danger
              }}
              chartData={getUS10YHistory()}
              description="突破4.5%进入警戒区，科技股和新能源继续杀估值"
            />
            
            <IndicatorCard
              indicator={marketData.dxy}
              unit=""
              thresholds={{
                warning: THRESHOLDS.dxy.high
              }}
              chartData={getDXYHistory()}
              description="突破105说明全球极度缺钱，港股持续承压"
            />
            
            <IndicatorCard
              indicator={marketData.brent}
              unit="$/桶"
              thresholds={{
                warning: THRESHOLDS.brent.high,
                danger: THRESHOLDS.brent.veryHigh
              }}
              chartData={getBrentHistory()}
              description="油价高企，中海油底仓坚决不动"
            />
            
            <IndicatorCard
              indicator={marketData.gold}
              unit="$/盎司"
              chartData={getGoldHistory()}
              description="美债拍卖流拍或美联储软化，黄金直接起飞"
            />
          </div>
        </section>
        
        {/* Section 2: 国债拍卖 + 美联储口风 */}
        <section className="mb-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <TreasuryAuctionCard auctions={treasuryAuctions} />
            <FedStatementsCard statements={fedStatements} />
          </div>
        </section>
        
        {/* Section 3: CPI数据 */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">通胀数据追踪</h2>
            <span className="text-xs text-muted-foreground">每月发布，重点标记日期</span>
          </div>
          
          <div className="grid gap-4 lg:grid-cols-2">
            <CPICard data={cpiData} />
            
            {/* 市场情绪总结 */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">当前市场情绪总结</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-warning mt-2 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">利率环境</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      10Y收益率 {marketData.us10y.value}% 处于警戒区间附近，
                      市场预期美联储将维持 Higher for longer 立场。
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-success mt-2 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">大宗商品</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      原油 ${marketData.brent.value}/桶 维持高位震荡，
                      黄金 ${marketData.gold.value.toFixed(0)}/盎司 受益于避险情绪。
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">美元流动性</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      美元指数 {marketData.dxy.value} 处于中性区间，
                      全球流动性暂未出现极端紧缩信号。
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-danger mt-2 shrink-0" />
                  <div>
                    <div className="font-medium text-sm">通胀压力</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      核心CPI环比 {cpiData.coreMonthly}% 超过 0.3% 警戒线，
                      通胀黏性依然存在，美联储短期难以转向。
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
        
        {/* Footer */}
        <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
          <p>数据仅供参考，不构成投资建议 · 投资有风险，入市需谨慎</p>
          <p className="mt-1">
            最后更新: {new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </footer>
      </main>
    </div>
  )
}
