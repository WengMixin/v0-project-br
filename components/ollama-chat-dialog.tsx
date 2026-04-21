'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Globe, MessageCircle, Send, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'user' | 'assistant'

interface Msg {
  id: string
  role: Role
  content: string
  usedWeb?: boolean
  usedTools?: string[]
  degraded?: boolean
  degradedReason?: string
  requestId?: string
}

interface ChatResponse {
  reply?: string
  error?: string | null
  details?: string
  mode?: 'chat' | 'chat-with-tools'
  used_tools?: string[]
  meta?: {
    degraded?: boolean
    degraded_reason?: string
    latency_ms?: number
    search_count?: number
    [key: string]: unknown
  } | null
  request_id?: string | null
}

export function OllamaChatDialog() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useWeb, setUseWeb] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    if (open) scrollToBottom()
  }, [messages, open, pending, error, scrollToBottom])

  const send = async () => {
    const text = input.trim()
    if (!text || pending) return

    setError(null)
    setInput('')
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setPending(true)

    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/ollama-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          useWeb,
          max_results: 5,
          timeout_ms: 90000,
        }),
      })

      const data = (await res.json()) as ChatResponse

      if (!res.ok || data.error) {
        setError(data.error || data.details || `HTTP ${res.status}`)
        return
      }

      const reply = (data.reply || '').trim() || '（空回复）'
      const usedTools = Array.isArray(data.used_tools) ? data.used_tools : []
      const degraded = Boolean(data.meta?.degraded)
      const degradedReason =
        typeof data.meta?.degraded_reason === 'string' ? data.meta.degraded_reason : undefined

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply,
          usedWeb: data.mode === 'chat-with-tools',
          usedTools,
          degraded,
          degradedReason,
          requestId: typeof data.request_id === 'string' ? data.request_id : undefined,
        },
      ])
    } catch {
      setError('网络错误，请重试')
    } finally {
      setPending(false)
    }
  }

  const clear = () => {
    setMessages([])
    setError(null)
    setInput('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MessageCircle className="size-4" />
          <span className="hidden sm:inline">Ollama 对话</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          'top-[5%] translate-y-0 sm:top-[8%] sm:translate-y-0',
          'flex max-h-[min(88vh,720px)] w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-lg'
        )}
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-12 text-left">
          <DialogTitle>Ollama 对话</DialogTitle>
          <DialogDescription>
            通过服务端转发至 OLLAMA_PROXY_URL；开启联网时调用{' '}
            <code className="text-xs">/api/chat-with-tools</code>（不调用 DeepSeek）。
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <Globe className={cn('size-4', useWeb ? 'text-primary' : 'text-muted-foreground')} />
            <Label htmlFor="ollama-use-web" className="text-sm cursor-pointer">
              联网检索
            </Label>
          </div>
          <Switch id="ollama-use-web" checked={useWeb} onCheckedChange={setUseWeb} disabled={pending} />
        </div>

        <div
          ref={scrollRef}
          className="min-h-[220px] max-h-[min(45vh,360px)] flex-1 overflow-y-auto px-4 py-3"
        >
          <div className="space-y-3">
            {messages.length === 0 && !pending && (
              <p className="text-sm text-muted-foreground">
                关闭联网为普通对话；开启后由代理侧工具（如 Tavily）检索后再回答。
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ml-6 bg-primary/10 text-foreground'
                    : 'mr-6 bg-muted/80 text-foreground'
                )}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {m.role === 'user' ? '你' : 'Ollama'}
                  </span>
                  {m.role === 'assistant' && m.usedWeb && (
                    <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                      联网
                    </Badge>
                  )}
                  {m.role === 'assistant' && m.usedTools && m.usedTools.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {m.usedTools.join(', ')}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                {m.role === 'assistant' && m.degraded && (
                  <p className="mt-2 text-[10px] text-warning border-t border-border/60 pt-2">
                    检索降级：{m.degradedReason || '未配置检索密钥或服务不可用'}，回答可能未使用实时网页。
                  </p>
                )}
                {m.role === 'assistant' && m.requestId && (
                  <p className="mt-1 text-[10px] text-muted-foreground font-mono">request_id: {m.requestId}</p>
                )}
              </div>
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                {useWeb ? '联网检索与推理中…' : '正在思考…'}
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-border p-4">
          <Textarea
            placeholder="输入消息…（Enter 发送，Shift+Enter 换行）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            disabled={pending}
            rows={3}
            className="min-h-[72px] resize-none"
          />
          <div className="flex justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={pending}>
              <Trash2 className="size-4" />
              清空
            </Button>
            <Button type="button" size="sm" onClick={() => void send()} disabled={pending || !input.trim()}>
              {pending ? <Spinner className="size-4" /> : <Send className="size-4" />}
              发送
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
