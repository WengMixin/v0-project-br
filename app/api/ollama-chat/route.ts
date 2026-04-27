import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : typeof n === 'string' ? parseInt(n, 10) : NaN
  if (!Number.isFinite(v)) return fallback
  return Math.min(max, Math.max(min, Math.floor(v)))
}

interface ToolsSuccessBody {
  reply?: string
  used_tools?: string[]
  meta?: {
    model?: string
    latency_ms?: number
    search_count?: number
    degraded?: boolean
    degraded_reason?: string
    [key: string]: unknown
  }
  error?: string | null
  request_id?: string
}

function extractToolsErrorMessage(status: number, raw: unknown): string {
  if (raw && typeof raw === 'object') {
    const d = (raw as { detail?: unknown }).detail
    if (d && typeof d === 'object' && 'error' in d) {
      const err = (d as { error?: string }).error
      if (typeof err === 'string') return err
    }
    const err = (raw as { error?: string }).error
    if (typeof err === 'string') return err
  }
  return `工具接口返回 ${status}`
}

/** Try strict JSON, then extract outermost {...}, then treat as plain text if safe */
function parseChatWithToolsBody(
  text: string,
  httpOk: boolean
): { ok: true; data: ToolsSuccessBody } | { ok: false; fallbackReply?: string; reason: string } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, reason: '工具接口返回空响应' }
  }

  // HTML error pages from proxy / nginx
  if (/^<!DOCTYPE/i.test(trimmed) || /^<html/i.test(trimmed) || trimmed.startsWith('<')) {
    return {
      ok: false,
      reason:
        '代理返回了 HTML 页面而非 JSON（常见于路径错误、反代或 Cloudflare 拦截）。请确认 OLLAMA_PROXY_URL 根地址可访问 POST /api/chat-with-tools',
    }
  }

  const tryParse = (s: string): ToolsSuccessBody | null => {
    try {
      return JSON.parse(s) as ToolsSuccessBody
    } catch {
      return null
    }
  }

  let parsed = tryParse(trimmed)
  if (!parsed) {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      parsed = tryParse(trimmed.slice(start, end + 1))
    }
  }

  if (parsed && typeof parsed === 'object') {
    return { ok: true, data: parsed }
  }

  // Some proxies return raw assistant text with 200
  if (httpOk && trimmed.length > 0 && trimmed.length < 200_000 && !trimmed.includes('\0')) {
    return {
      ok: true,
      data: {
        reply: trimmed,
        used_tools: [],
        meta: {
          degraded: true,
          degraded_reason: 'non_json_body_treated_as_reply',
        },
        error: null,
      },
    }
  }

  return {
    ok: false,
    reason: '工具接口返回非 JSON（且无法作为纯文本降级）。请检查代理 /api/chat-with-tools 是否返回 application/json',
  }
}

export async function POST(request: Request) {
  const ollamaProxyUrl = process.env.OLLAMA_PROXY_URL?.replace(/\/$/, '')
  const model = process.env.OLLAMA_MODEL || 'lfm2'
  const authToken = process.env.OLLAMA_AUTH_TOKEN

  if (!ollamaProxyUrl) {
    return NextResponse.json(
      { error: 'OLLAMA_PROXY_URL 未配置', reply: null },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
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

  const useWeb = body.useWeb === true
  const maxResults = clampInt(body.max_results, 1, 10, 5)
  const timeoutMs = clampInt(body.timeout_ms, 1000, 120_000, 90_000)

  try {
    if (useWeb) {
      const url = `${ollamaProxyUrl}/api/chat-with-tools`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          message: combined,
          model,
          use_web: true,
          max_results: maxResults,
          timeout_ms: timeoutMs,
        }),
      })

      const text = await response.text()
      const parsed = parseChatWithToolsBody(text, response.ok)

      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: parsed.reason,
            reply: null,
            mode: 'chat-with-tools',
            details: text.length > 800 ? `${text.slice(0, 800)}…` : text,
          },
          { status: response.ok ? 502 : response.status >= 400 && response.status < 600 ? response.status : 502 }
        )
      }

      const typed = parsed.data

      if (!response.ok) {
        return NextResponse.json(
          {
            error: extractToolsErrorMessage(response.status, typed),
            reply: null,
            mode: 'chat-with-tools',
            details: text.slice(0, 500),
          },
          { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
        )
      }

      if (typed.error) {
        return NextResponse.json({
          error: typed.error,
          reply: null,
          mode: 'chat-with-tools',
          request_id: typed.request_id,
        })
      }

      const reply = typeof typed.reply === 'string' ? typed.reply.trim() : ''
      return NextResponse.json({
        reply: reply || '（空回复）',
        model: typed.meta?.model ?? model,
        mode: 'chat-with-tools' as const,
        used_tools: typed.used_tools ?? [],
        meta: typed.meta ?? null,
        request_id: typed.request_id ?? null,
        error: null,
      })
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' }
    if (authToken) headers.Authorization = `Bearer ${authToken}`

    const response = await fetch(`${ollamaProxyUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: combined, model }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return NextResponse.json(
        {
          error: `Ollama 代理返回 ${response.status}`,
          details: errText.slice(0, 500),
          reply: null,
          mode: 'chat' as const,
        },
        { status: 502 }
      )
    }

    const data = (await response.json()) as { reply?: string; model?: string }
    const reply = typeof data.reply === 'string' ? data.reply.trim() : ''

    return NextResponse.json({
      reply: reply || '（空回复）',
      model: data.model ?? model,
      mode: 'chat' as const,
      used_tools: [] as string[],
      meta: null,
      request_id: null as string | null,
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
