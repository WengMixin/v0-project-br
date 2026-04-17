import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  role: ChatRole
  content: string
}

function normalizeMessages(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>

  if (Array.isArray(o.messages)) {
    const out: ChatMessage[] = []
    for (const m of o.messages) {
      if (!m || typeof m !== 'object') continue
      const r = (m as { role?: string; content?: unknown }).role
      const c = (m as { content?: unknown }).content
      if ((r === 'user' || r === 'assistant') && typeof c === 'string' && c.trim()) {
        out.push({ role: r, content: c.trim() })
      }
    }
    return out.length ? out : null
  }

  if (typeof o.message === 'string' && o.message.trim()) {
    return [{ role: 'user', content: o.message.trim() }]
  }

  return null
}

function buildProxyMessage(messages: ChatMessage[]): string {
  if (messages.length === 1) return messages[0].content
  return messages
    .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
    .join('\n\n')
}

export async function POST(request: Request) {
  const ollamaProxyUrl = process.env.OLLAMA_PROXY_URL
  const model = process.env.OLLAMA_MODEL || 'lfm2'
  const authToken = process.env.OLLAMA_AUTH_TOKEN

  if (!ollamaProxyUrl) {
    return NextResponse.json(
      { error: 'OLLAMA_PROXY_URL 未配置', reply: null },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '无效的 JSON 请求体', reply: null }, { status: 400 })
  }

  const messages = normalizeMessages(body)
  if (!messages) {
    return NextResponse.json(
      { error: '请提供 message 字符串或 messages 数组', reply: null },
      { status: 400 }
    )
  }

  const combined = buildProxyMessage(messages)
  const maxLen = 48000
  if (combined.length > maxLen) {
    return NextResponse.json({ error: '消息过长', reply: null }, { status: 400 })
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  try {
    const response = await fetch(`${ollamaProxyUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: combined, model }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return NextResponse.json(
        {
          error: `Ollama 代理返回 ${response.status}`,
          details: text.slice(0, 500),
          reply: null,
        },
        { status: 502 }
      )
    }

    const data = (await response.json()) as { reply?: string; model?: string; raw?: unknown }
    const reply = typeof data.reply === 'string' ? data.reply : ''

    return NextResponse.json({
      reply,
      model: data.model ?? model,
      error: null,
    })
  } catch (e) {
    console.error('[ollama-chat]', e)
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : '请求失败',
        reply: null,
      },
      { status: 500 }
    )
  }
}
