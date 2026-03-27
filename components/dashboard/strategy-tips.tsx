'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Zap, 
  TrendingUp, 
  Gem,
  Fuel,
  Building2,
  Cpu
} from 'lucide-react'

interface StrategyTip {
  condition: string
  action: string
  assets: string[]
  icon: React.ReactNode
  type: 'defense' | 'offense' | 'gold'
}

const strategies: StrategyTip[] = [
  {
    condition: '10Y收益率持续上涨 / 核心CPI高企',
    action: '高股息防守，科技股装死',
    assets: ['神华', '中海油', '银行股'],
    icon: <Shield className="size-4" />,
    type: 'defense'
  },
  {
    condition: '10Y收益率高位暴跌 / 美联储语气软化',
    action: '准备抄底科技股',
    assets: ['中芯国际', '百度', '新能源'],
    icon: <Cpu className="size-4" />,
    type: 'offense'
  },
  {
    condition: '国债拍卖流拍 / 投标倍数异常低',
    action: 'YCC前兆，满仓干黄金',
    assets: ['黄金ETF', 'GLD', '金矿股'],
    icon: <Gem className="size-4" />,
    type: 'gold'
  },
  {
    condition: '油价突破90-100美元',
    action: '中海油底仓坚决不动',
    assets: ['中海油', '能源ETF'],
    icon: <Fuel className="size-4" />,
    type: 'defense'
  },
  {
    condition: '美元指数突破105',
    action: '全球紧缩，港股承压流血',
    assets: ['减持港股科技', '减持新能源'],
    icon: <Building2 className="size-4" />,
    type: 'defense'
  },
  {
    condition: '美元指数大幅跳水',
    action: '放水预期升温，科技股春天',
    assets: ['增持科技股', '增持成长股'],
    icon: <Zap className="size-4" />,
    type: 'offense'
  }
]

export function StrategyTips() {
  const getTypeStyle = (type: StrategyTip['type']) => {
    switch (type) {
      case 'defense':
        return 'border-l-warning bg-warning/5'
      case 'offense':
        return 'border-l-success bg-success/5'
      case 'gold':
        return 'border-l-gold bg-gold/5'
    }
  }
  
  const getIconStyle = (type: StrategyTip['type']) => {
    switch (type) {
      case 'defense':
        return 'bg-warning/20 text-warning'
      case 'offense':
        return 'bg-success/20 text-success'
      case 'gold':
        return 'bg-gold/20 text-gold'
    }
  }
  
  const getBadgeStyle = (type: StrategyTip['type']) => {
    switch (type) {
      case 'defense':
        return 'bg-warning/20 text-warning border-warning/30'
      case 'offense':
        return 'bg-success/20 text-success border-success/30'
      case 'gold':
        return 'bg-gold/20 text-gold-foreground border-gold/30'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="size-4 text-primary" />
          </div>
          <CardTitle className="text-base">策略速查表</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border-l-4 ${getTypeStyle(strategy.type)}`}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className={`flex size-6 items-center justify-center rounded ${getIconStyle(strategy.type)}`}>
                  {strategy.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {strategy.condition}
                  </div>
                </div>
              </div>
              
              <div className="font-medium text-sm mb-2">
                {strategy.action}
              </div>
              
              <div className="flex flex-wrap gap-1">
                {strategy.assets.map((asset, i) => (
                  <Badge 
                    key={i} 
                    variant="outline"
                    className={`text-xs ${getBadgeStyle(strategy.type)}`}
                  >
                    {asset}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
