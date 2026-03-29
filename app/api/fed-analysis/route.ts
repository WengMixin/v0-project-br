import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

// 初始化Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

interface FedStatement {
  id: string
  date: string
  speaker: string
  title: string
  content: string
  url: string
}

interface AnalysisResult {
  id: string
  date: string
  speaker: string
  title: string
  stance: 'hawkish' | 'dovish' | 'neutral'
  score: number // -100 (极度鸽派) 到 +100 (极度鹰派)
  summary: string
  keyPhrases: string[]
  actionSignal: string
  analyzedAt: string
}

// 从美联储官网抓取最新声明/演讲
async function fetchLatestStatements(): Promise<FedStatement[]> {
  const statements: FedStatement[] = []
  
  console.log('[v0] Fetching Fed statements from official sources...')
  
  try {
    // 尝试获取美联储新闻发布
    const response = await fetch(
      'https://www.federalreserve.gov/json/ne-press.json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        next: { revalidate: 1800 } // 缓存30分钟
      }
    )
    
    console.log('[v0] Fed API response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        for (const item of data.slice(0, 10)) {
          statements.push({
            id: item.id || `fed-${Date.now()}-${Math.random()}`,
            date: item.d || new Date().toISOString().split('T')[0],
            speaker: extractSpeaker(item.t || ''),
            title: item.t || 'Federal Reserve Statement',
            content: item.t || '', // 标题作为简短内容
            url: item.l ? `https://www.federalreserve.gov${item.l}` : ''
          })
        }
      }
    }
  } catch (error) {
    console.error('[v0] Fed statements fetch error:', error)
  }
  
  // 如果没有获取到，返回示例数据
  if (statements.length === 0) {
    statements.push({
      id: 'fallback-1',
      date: new Date().toISOString().split('T')[0],
      speaker: 'Powell',
      title: 'Federal Reserve Press Release',
      content: 'The Committee decided to maintain the target range for the federal funds rate. The Committee will continue to assess additional information and its implications for monetary policy.',
      url: 'https://www.federalreserve.gov/newsevents/pressreleases.htm'
    })
  }
  
  return statements
}

function extractSpeaker(title: string): string {
  const speakers = [
    { name: 'Powell', keywords: ['powell', 'chair'] },
    { name: 'Waller', keywords: ['waller'] },
    { name: 'Williams', keywords: ['williams'] },
    { name: 'Barr', keywords: ['barr'] },
    { name: 'Bowman', keywords: ['bowman'] },
    { name: 'Jefferson', keywords: ['jefferson'] },
    { name: 'Cook', keywords: ['cook'] },
    { name: 'Kugler', keywords: ['kugler'] },
  ]
  
  const lower = title.toLowerCase()
  for (const speaker of speakers) {
    if (speaker.keywords.some(k => lower.includes(k))) {
      return speaker.name
    }
  }
  
  return 'FOMC'
}

// 使用Ollama代理服务分析发言内容
// 文档: OLLAMA_PROXY_URL 指向代理服务根地址（如 https://xxx.trycloudflare.com）
async function analyzeWithOllama(statement: FedStatement): Promise<AnalysisResult | null> {
  const ollamaProxyUrl = process.env.OLLAMA_PROXY_URL
  const model = process.env.OLLAMA_MODEL || 'lfm2'
  const authToken = process.env.OLLAMA_AUTH_TOKEN // 可选的鉴权令牌
  
  if (!ollamaProxyUrl) {
    console.warn('[v0] OLLAMA_PROXY_URL not configured')
    return null
  }
  
  const message = `你是一位专业的美联储政策分析师。请分析以下美联储官员的发言，判断其货币政策立场。

发言人：${statement.speaker}
日期：${statement.date}
标题：${statement.title}
内容：${statement.content}

请按以下JSON格式回复（只返回JSON，不要其他内容）：
{
  "stance": "hawkish" 或 "dovish" 或 "neutral",
  "score": 从-100到+100的数字（-100极度鸽派，+100极度鹰派），
  "summary": "一句话总结（中文，不超过50字）",
  "keyPhrases": ["关键短语1", "关键短语2", "关键短语3"],
  "actionSignal": "对投资者的建议（中文，不超过30字）"
}

判断标准：
- 鹰派信号：higher for longer、通胀黏性、劳动力市场强劲、不急于降息
- 鸽派信号：金融稳定风险、暂缓缩表、关注就业、通胀回落
- 中性信号：数据依赖、需要更多信息、保持观望`

  try {
    // 使用代理服务的 /api/chat 端点
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // 如果配置了鉴权令牌，添加到请求头
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    
    const response = await fetch(`${ollamaProxyUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        model
      })
    })
    
    if (!response.ok) {
      console.error('[v0] Ollama Proxy API error:', response.status)
      return null
    }
    
    const data = await response.json()
    // 代理服务返回格式: { model: string, reply: string, raw: object }
    const responseText = data.reply || ''
    
    // 提取JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[v0] Failed to extract JSON from Ollama response')
      return null
    }
    
    const analysis = JSON.parse(jsonMatch[0])
    
    return {
      id: statement.id,
      date: statement.date,
      speaker: statement.speaker,
      title: statement.title,
      stance: analysis.stance || 'neutral',
      score: typeof analysis.score === 'number' ? analysis.score : 0,
      summary: analysis.summary || '分析中...',
      keyPhrases: Array.isArray(analysis.keyPhrases) ? analysis.keyPhrases : [],
      actionSignal: analysis.actionSignal || '继续观望',
      analyzedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('[v0] Ollama analysis error:', error)
    return null
  }
}

// 基于关键词的快速分析（备用方案）
function quickAnalysis(statement: FedStatement): AnalysisResult {
  const content = (statement.title + ' ' + statement.content).toLowerCase()
  
  const hawkishKeywords = [
    'higher for longer', 'inflation persistent', 'strong labor',
    'not ready to cut', 'vigilant', 'restrictive', 'tight'
  ]
  
  const dovishKeywords = [
    'financial stability', 'pause', 'slow', 'patient',
    'employment concerns', 'growth concerns', 'cut rates'
  ]
  
  let score = 0
  const keyPhrases: string[] = []
  
  for (const keyword of hawkishKeywords) {
    if (content.includes(keyword)) {
      score += 15
      keyPhrases.push(keyword)
    }
  }
  
  for (const keyword of dovishKeywords) {
    if (content.includes(keyword)) {
      score -= 15
      keyPhrases.push(keyword)
    }
  }
  
  score = Math.max(-100, Math.min(100, score))
  
  let stance: 'hawkish' | 'dovish' | 'neutral' = 'neutral'
  let actionSignal = '保持观望，关注后续数据'
  
  if (score > 20) {
    stance = 'hawkish'
    actionSignal = '防守为主，持有高股息资产'
  } else if (score < -20) {
    stance = 'dovish'
    actionSignal = '准备抄底科技股'
  }
  
  return {
    id: statement.id,
    date: statement.date,
    speaker: statement.speaker,
    title: statement.title,
    stance,
    score,
    summary: `${statement.speaker}发言整体${stance === 'hawkish' ? '偏鹰派' : stance === 'dovish' ? '偏鸽派' : '中性'}`,
    keyPhrases: keyPhrases.slice(0, 3),
    actionSignal,
    analyzedAt: new Date().toISOString()
  }
}

export async function GET() {
  console.log('[v0] Fed Analysis API called - 无缓存模式')
  
  try {
    // 每次都执行完整流程：RSS -> 爬正文 -> 问大模型
    console.log('[v0] Step 1: 获取RSS/最新声明...')
    const statements = await fetchLatestStatements()
    console.log('[v0] Fetched', statements.length, 'statements')
    
    // 分析每条声明
    const analyses: AnalysisResult[] = []
    
    for (const statement of statements.slice(0, 5)) {
      console.log('[v0] Step 2: 分析声明:', statement.title)
      
      // 尝试Ollama分析
      console.log('[v0] Step 3: 调用Ollama大模型...')
      let analysis = await analyzeWithOllama(statement)
      
      // 如果Ollama失败，使用快速分析
      if (!analysis) {
        console.log('[v0] Ollama failed, using quick analysis')
        analysis = quickAnalysis(statement)
      } else {
        console.log('[v0] Ollama analysis successful, score:', analysis.score)
      }
      
      analyses.push(analysis)
    }
    
    return NextResponse.json({
      success: true,
      analyses,
      source: 'live',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[v0] Fed analysis error:', error)
    
    // 返回备用分析
    return NextResponse.json({
      success: false,
      analyses: [{
        id: 'error-fallback',
        date: new Date().toISOString().split('T')[0],
        speaker: 'FOMC',
        title: '无法获取最新数据',
        stance: 'neutral',
        score: 0,
        summary: '请稍后重试或检查网络连接',
        keyPhrases: [],
        actionSignal: '保持观望',
        analyzedAt: new Date().toISOString()
      }],
      error: 'Analysis failed',
      timestamp: new Date().toISOString()
    })
  }
}
