'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { AlertTriangle, Lock, Shield } from 'lucide-react'

// 只允许登录的邮箱
const ALLOWED_EMAIL = 'mixin.weng2016@gmail.com'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      setError('您的账户没有访问权限')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // 前端验证邮箱
    if (email !== ALLOWED_EMAIL) {
      setError('此邮箱没有访问权限')
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/')
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '登录失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">宏观监控面板</CardTitle>
              <CardDescription>
                请登录以访问专属监控面板
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-danger p-3 rounded-lg bg-danger/10 border border-danger/20">
                      <AlertTriangle className="size-4" />
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>登录中...</>
                    ) : (
                      <>
                        <Lock className="size-4 mr-2" />
                        登录
                      </>
                    )}
                  </Button>
                </div>
              </form>
              <div className="mt-6 text-center text-xs text-muted-foreground">
                此面板仅限授权用户访问
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center bg-background">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
