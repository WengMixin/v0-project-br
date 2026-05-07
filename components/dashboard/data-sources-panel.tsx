'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Database, Key, CheckCircle2, XCircle, RefreshCw, Wifi, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Spinner } from '@/components/ui/spinner'

interface ConnectionResult {
  name: string
  status: 'connected' | 'error' | 'not_configured'
  message: string
  latency?: number
}

interface TestResult {
  success: boolean
  summary: string
  connections: ConnectionResult[]
  timestamp: string
}

interface DataSource {
  name: string
  description: string
  features: string[]
  apiKeyRequired: boolean
  apiKeyEnvVar?: string
  freeLimit: string
  docsUrl: string
  getKeyUrl?: string
}

const dataSources: DataSource[] = [
  {
    name: 'Yahoo Finance',
    description: '股票、期货、外汇实时数据',
    features: ['10Y国债收益率', '美元指数（Yahoo，服务端可能被拒）', '原油期货', '黄金期货', '港股代码见 HK_YAHOO_SYMBOLS'],
    apiKeyRequired: false,
    freeLimit: '无限制（合理使用）',
    docsUrl: 'https://finance.yahoo.com/'
  },
  {
    name: 'Treasury Direct',
    description: '美国财政部官方API - 国债拍卖数据',
    features: ['国债拍卖结果', '投标倍数', '中标利率', '发行金额'],
    apiKeyRequired: false,
    freeLimit: '无限制',
    docsUrl: 'https://fiscaldata.treasury.gov/api-documentation/'
  },
  {
    name: 'FRED API',
    description: '美联储经济数据库 - 80万+经济时间序列（首选数据源）',
    features: ['核心CPI同比/环比', '布伦特原油现货价格', '美元指数覆盖（FRED DTWEXAFEGS，可 DXY_FRED_SERIES）', '国债收益率历史', '联邦基金利率', '宏观扩展 API：准备金/WALCL/ON RRP/TGA/失业率'],
    apiKeyRequired: true,
    apiKeyEnvVar: 'FRED_API_KEY',
    freeLimit: '120次/分钟',
    docsUrl: 'https://fred.stlouisfed.org/docs/api/fred/',
    getKeyUrl: 'https://fred.stlouisfed.org/docs/api/api_key.html'
  },
  {
    name: 'Alpha Vantage',
    description: '股票、外汇数据（注：免费版不支持黄金XAU）',
    features: ['外汇汇率', '股票数据', '技术指标'],
    apiKeyRequired: false,
    apiKeyEnvVar: 'ALPHA_VANTAGE_API_KEY',
    freeLimit: '25次/天（可选）',
    docsUrl: 'https://www.alphavantage.co/documentation/',
    getKeyUrl: 'https://www.alphavantage.co/support/#api-key'
  },
  {
    name: 'Yahoo Finance (黄金)',
    description: '黄金期货GC=F免费数据源',
    features: ['黄金期货价格', '无需API Key', '无调用限制'],
    apiKeyRequired: false,
    freeLimit: '无限制',
    docsUrl: 'https://finance.yahoo.com/quote/GC=F/'
  },
  {
    name: 'Financial Modeling Prep',
    description: '综合金融数据API',
    features: ['国债收益率', '大宗商品', '经济日历', '财务报表'],
    apiKeyRequired: true,
    apiKeyEnvVar: 'FMP_API_KEY',
    freeLimit: '250次/天',
    docsUrl: 'https://site.financialmodelingprep.com/developer/docs',
    getKeyUrl: 'https://site.financialmodelingprep.com/developer/docs'
  },
  {
    name: 'Tiingo',
    description: '黄金现货XAUUSD实时数据（首选）',
    features: ['XAUUSD现货价格', '买卖价差', '机构级Forex数据', '微秒级更新'],
    apiKeyRequired: true,
    apiKeyEnvVar: 'TIINGO_API_KEY',
    freeLimit: '500次/天',
    docsUrl: 'https://www.tiingo.com/documentation/forex',
    getKeyUrl: 'https://www.tiingo.com/'
  },
  {
    name: 'GoldAPI',
    description: '黄金现货价格（备用，定时刷新）',
    features: ['黄金现货价格', '开盘/收盘价', '最高/最低价', '实时报价'],
    apiKeyRequired: true,
    apiKeyEnvVar: 'GOLDAPI_KEY',
    freeLimit: '50次/月',
    docsUrl: 'https://www.goldapi.io/documentation',
    getKeyUrl: 'https://www.goldapi.io/'
  }
]

export function DataSourcesPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const testConnections = async () => {
    setIsTesting(true)
    try {
      const res = await fetch('/api/test-connections')
      if (res.ok) {
        const data = await res.json()
        setTestResult(data)
      }
    } catch (error) {
      console.error('Connection test failed:', error)
    } finally {
      setIsTesting(false)
    }
  }

  useEffect(() => {
    // Auto-test connections on mount
    testConnections()
  }, [])

  const getConnectionStatus = (sourceName: string) => {
    if (!testResult) return null
    return testResult.connections.find(c => c.name === sourceName)
  }

  const connectedCount = testResult?.connections.filter(c => c.status === 'connected').length || 0
  const totalCount = testResult?.connections.length || 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <CardTitle className="text-base">数据源配置</CardTitle>
            {testResult && (
              <Badge 
                variant="outline" 
                className={connectedCount === totalCount 
                  ? "text-success border-success/30 bg-success/10" 
                  : "text-warning border-warning/30 bg-warning/10"
                }
              >
                <Wifi className="size-3 mr-1" />
                {connectedCount}/{totalCount} 已连接
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={testConnections}
              disabled={isTesting}
            >
              {isTesting ? (
                <Spinner className="size-4 mr-1" />
              ) : (
                <RefreshCw className="size-4 mr-1" />
              )}
              测试连接
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '收起' : '展开详情'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          配置免费API获取实时金融数据。部分数据源需要API Key。
        </p>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* Connection Status Summary */}
          {testResult && (
            <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">连接状态摘要</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(testResult.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {testResult.connections.map((conn) => (
                  <div 
                    key={conn.name}
                    className={`p-2 rounded text-xs flex items-center gap-2 ${
                      conn.status === 'connected' 
                        ? 'bg-success/10 text-success' 
                        : conn.status === 'error'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {conn.status === 'connected' ? (
                      <CheckCircle2 className="size-3.5 shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 shrink-0" />
                    )}
                    <span className="truncate">{conn.name}</span>
                    {conn.latency && (
                      <span className="ml-auto text-muted-foreground flex items-center gap-0.5">
                        <Clock className="size-2.5" />
                        {conn.latency}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {dataSources.map((source) => {
              const connection = getConnectionStatus(source.name)
              const status = connection?.status || 'not_configured'
              
              return (
                <div 
                  key={source.name}
                  className="p-4 rounded-lg border border-border bg-secondary/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{source.name}</h4>
                      {status === 'connected' ? (
                        <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                          <CheckCircle2 className="size-3 mr-1" />
                          已连接
                        </Badge>
                      ) : status === 'error' ? (
                        <Badge variant="outline" className="text-danger border-danger/30 bg-danger/10">
                          <XCircle className="size-3 mr-1" />
                          错误
                        </Badge>
                      ) : source.apiKeyRequired ? (
                        <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                          <Key className="size-3 mr-1" />
                          需要配置
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          检测中...
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
                  
                  {connection?.message && (
                    <p className={`text-xs mb-2 ${
                      status === 'connected' ? 'text-success' : 
                      status === 'error' ? 'text-danger' : 'text-muted-foreground'
                    }`}>
                      {connection.message}
                    </p>
                  )}
                  
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
                      {status === 'connected' && (
                        <CheckCircle2 className="size-3 text-success inline ml-2" />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-medium text-sm mb-2">如何配置 API Key</h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>点击上方数据源的「获取免费API Key」链接注册</li>
              <li>复制获得的 API Key</li>
              <li>在 v0 设置中添加环境变量（点击右上角设置图标 → Vars）</li>
              <li>点击「测试连接」按钮验证配置</li>
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
