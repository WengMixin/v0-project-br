import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-sm">
        <Card className="border-danger/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-danger/10">
              <AlertTriangle className="size-6 text-danger" />
            </div>
            <CardTitle className="text-2xl">认证错误</CardTitle>
            <CardDescription>
              登录过程中发生错误，请重试
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/auth/login">返回登录</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
