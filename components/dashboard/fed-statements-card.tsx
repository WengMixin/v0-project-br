'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic2, TrendingUp, TrendingDown, Minus, RefreshCw, Wifi, WifiOff, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useFedAnalysis, type FedAnalysisItem } from '@/hooks/use-market-data'

export function FedStatementsCard() {
  const [useDeepSeek, setUseDeepSeek] = useState(false)
  const preferredModel = useDeepSeek ? 'deepseek' : 'ollama'
  const { analyses, isLoading, isError, refresh, source } = useFedAnalysis(preferredModel)

  const isLive = source === 'live'
  
  const getSentimentIcon = (stance: FedAnalysisItem['stance']) => {
    switch (stance) {
      case 'hawkish':
        return <TrendingUp className="size-4" />
      case 'dovish':
        return <TrendingDown className="size-4" />
      default:
        return <Minus className="size-4" />
    }
  }
  
  const getSentimentStyle = (stance: FedAnalysisItem['stance']) => {
    switch (stance) {
      case 'hawkish':
        return 'bg-danger/20 text-danger border-danger/30'
      case 'dovish':
        return 'bg-success/20 text-success border-success/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }
  
  const getSentimentLabel = (stance: FedAnalysisItem['stance']) => {
    switch (stance) {
      case 'hawkish':
        return '鹰派'
      case 'dovish':
        return '鸽派'
      default:
        return '中性'
    }
  }
  
  // 计算整体鹰鸽指数
  const overallScore = analyses.length > 0 
    ? Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length)
    : 0
  
  const overallStance = overallScore > 20 ? 'hawkish' : overallScore < -20 ? 'dovish' : 'neutral'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mic2 className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">美联储口风追踪</CardTitle>
              <CardDescription className="flex items-center gap-2 flex-wrap">
                AI分析预期管理信号
                {source !== undefined && (
                  isLive ? (
                    <span className="flex items-center gap-1 text-success">
                      <Wifi className="size-3" /> 实时
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-warning">
                      <WifiOff className="size-3" /> 缓存
                    </span>
                  )
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center space-x-2 rounded-full border border-border bg-muted/50 px-2 py-1">
              <Label
                htmlFor="fed-model-switch"
                className="text-[10px] font-medium text-muted-foreground cursor-pointer whitespace-nowrap"
              >
                {useDeepSeek ? 'DeepSeek' : 'Ollama'}
              </Label>
              <Switch
                id="fed-model-switch"
                checked={useDeepSeek}
                onCheckedChange={setUseDeepSeek}
                disabled={isLoading}
                className="scale-75"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refresh()}
              disabled={isLoading}
              className="size-8"
            >
              <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            加载失败，请稍后重试
          </div>
        ) : (
          <>
            {/* 整体鹰鸽指数 */}
            <div className={cn(
              'p-4 rounded-lg mb-4 border',
              overallStance === 'hawkish' && 'bg-danger/10 border-danger/30',
              overallStance === 'dovish' && 'bg-success/10 border-success/30',
              overallStance === 'neutral' && 'bg-secondary border-border'
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">整体鹰鸽指数</span>
                <Badge variant="outline" className={getSentimentStyle(overallStance)}>
                  {getSentimentIcon(overallStance)}
                  <span className="ml-1">{getSentimentLabel(overallStance)}</span>
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full transition-all',
                      overallScore > 0 ? 'bg-danger' : 'bg-success'
                    )}
                    style={{ 
                      width: `${Math.abs(overallScore)}%`,
                      marginLeft: overallScore < 0 ? `${50 - Math.abs(overallScore) / 2}%` : '50%'
                    }}
                  />
                </div>
                <span className={cn(
                  'text-lg font-bold tabular-nums',
                  overallScore > 0 ? 'text-danger' : overallScore < 0 ? 'text-success' : 'text-muted-foreground'
                )}>
                  {overallScore > 0 ? '+' : ''}{overallScore}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {overallStance === 'hawkish' 
                  ? '偏紧缩，建议持有高股息资产防守'
                  : overallStance === 'dovish'
                  ? '偏宽松，可考虑增加科技股仓位'
                  : '中性观望，关注后续数据和发言'
                }
              </p>
            </div>
            
            {/* 最新发言分析 */}
            <div className="space-y-3">
              {analyses.slice(0, 3).map((analysis, index) => (
                <div
                  key={analysis.id || `analysis-${index}`}
                  className="p-3 rounded-lg bg-secondary/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{analysis.speaker}</span>
                      <span className="text-xs text-muted-foreground">{analysis.date}</span>
                    </div>
                    <Badge variant="outline" className={cn('text-xs gap-1', getSentimentStyle(analysis.stance))}>
                      {getSentimentIcon(analysis.stance)}
                      {getSentimentLabel(analysis.stance)}
                      <span className="ml-1 opacity-70">
                        {analysis.score > 0 ? '+' : ''}{analysis.score}
                      </span>
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.summary}
                  </p>
                  
                  {analysis.keyPhrases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keyPhrases.map((phrase, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="text-xs font-normal"
                        >
                          {phrase}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-medium">
                      操作建议：{analysis.actionSignal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 信号参考 */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="size-4 text-danger" />
                  <span className="text-sm font-medium text-danger">紧缩信号</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {"\"Higher for longer\""}、通胀黏性 → 高股息防守
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="size-4 text-success" />
                  <span className="text-sm font-medium text-success">投降信号</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  金融稳定风险、暂缓QT → 抄底科技股
                </p>
              </div>
            </div>
            
            {/* 数据来源链接 */}
            <div className="mt-4 flex items-center justify-center">
              <a
                href="https://www.federalreserve.gov/newsevents/speeches.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="size-3" />
                查看美联储官网完整发言
              </a>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
