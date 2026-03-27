'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Database, Key, CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'

interface DataSource {
  name: string
  description: string
  features: string[]
  apiKeyRequired: boolean
  apiKeyEnvVar?: string
  freeLimit: string
  docsUrl: string
  getKeyUrl?: string
  status: 'connected' | 'needs-key' | 'available'
}

const dataSources: DataSource[] = [
  {
    name: 'Yahoo Finance',
    description: '股票、期货、外汇实时数据',
    features: ['10Y国债收益率', '美元指数', '原油期货', '黄金期货'],
    apiKeyRequired: false,
    freeLimit: '无限制（合理使用）',
    docsUrl: 'https://finance.yahoo.com/',
    status: 'connected'
  },
  {
    name: 'FRED API',
    description: '美联储经济数据库 - 80万+经济时间序列',
    features: ['国债收益率历史', '核心CPI', '失业率', '联邦基金利率'],
    apiKeyRequired: true,
    apiKeyEnvVar: 'FRED_API_KEY',
    freeLimit: '120次/分钟',
    docsUrl: 'https://fred.stlouisfed.org/docs/api/fred/',
    getKeyUrl: 'https://fred.stlouisfed.org/docs/api/api_key.html',
    status: 'needs-key'
  },
  {
    name: 'Treasury Direct',
    description: '美国财政部官方API - 国债拍卖数据',
    features: ['国债拍卖结果', '投标倍数', '中标利率', '发行金额'],
    apiKeyRequired: false,
    freeLimit: '无限制',
    docsUrl: 'https://fiscaldata.treasury.gov/api-documentation/',
    status: 'connected'
  },
  {
    name: 'Alpha Vantage',
    description: '股票、外汇、大宗商品数据',
    features: ['原油价格', '外汇汇率', '股票数据', '技术指标'],
    apiKeyRequired: true,
    apiKeyEnvVar: 'ALPHA_VANTAGE_API_KEY',
    freeLimit: '25次/天',
    docsUrl: 'https://www.alphavantage.co/documentation/',
    getKeyUrl: 'https://www.alphavantage.co/support/#api-key',
    status: 'available'
  },
  {
    name: 'Financial Modeling Prep',
    description: '综合金融数据API',
    features: ['国债收益率', '大宗商品', '经济日历', '财务报表'],
    apiKeyRequired: true,
    apiKeyEnvVar: 'FMP_API_KEY',
    freeLimit: '250次/天',
    docsUrl: 'https://site.financialmodelingprep.com/developer/docs',
    getKeyUrl: 'https://site.financialmodelingprep.com/developer/docs',
    status: 'available'
  }
]

export function DataSourcesPanel() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <CardTitle className="text-base">数据源配置</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开详情'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          配置免费API获取实时金融数据。部分数据源需要API Key。
        </p>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {dataSources.map((source) => (
              <div 
                key={source.name}
                className="p-4 rounded-lg border border-border bg-secondary/30"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{source.name}</h4>
                    {source.status === 'connected' ? (
                      <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                        <CheckCircle2 className="size-3 mr-1" />
                        已连接
                      </Badge>
                    ) : source.status === 'needs-key' ? (
                      <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                        <Key className="size-3 mr-1" />
                        需要配置
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        可用
                      </Badge>
                    )}
                  </div>
                  <a 
                    href={source.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    文档 <ExternalLink className="size-3" />
                  </a>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">
                  {source.description}
                </p>
                
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {source.features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    免费额度: {source.freeLimit}
                  </span>
                  
                  {source.apiKeyRequired && source.getKeyUrl && (
                    <a 
                      href={source.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      获取免费API Key <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                
                {source.apiKeyRequired && source.apiKeyEnvVar && (
                  <div className="mt-3 p-2 rounded bg-muted/50 text-xs">
                    <span className="text-muted-foreground">环境变量: </span>
                    <code className="font-mono text-primary">{source.apiKeyEnvVar}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-medium text-sm mb-2">如何配置 API Key</h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>点击上方数据源的「获取免费API Key」链接注册</li>
              <li>复制获得的 API Key</li>
              <li>在 v0 设置中添加环境变量（点击右上角设置图标 → Vars）</li>
              <li>刷新页面即可使用实时数据</li>
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
