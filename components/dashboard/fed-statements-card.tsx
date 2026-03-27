'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FedStatement } from '@/lib/market-data'

interface FedStatementsCardProps {
  statements: FedStatement[]
}

export function FedStatementsCard({ statements }: FedStatementsCardProps) {
  const getSentimentIcon = (sentiment: FedStatement['sentiment']) => {
    switch (sentiment) {
      case 'hawkish':
        return <TrendingUp className="size-4" />
      case 'dovish':
        return <TrendingDown className="size-4" />
      default:
        return <Minus className="size-4" />
    }
  }
  
  const getSentimentStyle = (sentiment: FedStatement['sentiment']) => {
    switch (sentiment) {
      case 'hawkish':
        return 'bg-danger/20 text-danger border-danger/30'
      case 'dovish':
        return 'bg-success/20 text-success border-success/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }
  
  const getSentimentLabel = (sentiment: FedStatement['sentiment']) => {
    switch (sentiment) {
      case 'hawkish':
        return '鹰派'
      case 'dovish':
        return '鸽派'
      default:
        return '中性'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Mic2 className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">美联储口风追踪</CardTitle>
            <CardDescription>预期管理与政策信号</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {statements.map((statement, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-secondary/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{statement.speaker}</span>
                  <span className="text-xs text-muted-foreground">{statement.date}</span>
                </div>
                <Badge variant="outline" className={cn('text-xs gap-1', getSentimentStyle(statement.sentiment))}>
                  {getSentimentIcon(statement.sentiment)}
                  {getSentimentLabel(statement.sentiment)}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                {statement.summary}
              </p>
              
              <div className="flex flex-wrap gap-1.5">
                {statement.keywords.map((keyword, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="text-xs font-normal"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="size-4 text-danger" />
              <span className="text-sm font-medium text-danger">紧缩信号</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {"\"Higher for longer\""}、强调通胀黏性 → 继续持有高股息防守
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="size-4 text-success" />
              <span className="text-sm font-medium text-success">投降信号</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              提及金融稳定风险、暂缓QT、紧急会议 → 准备抄底科技股
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
