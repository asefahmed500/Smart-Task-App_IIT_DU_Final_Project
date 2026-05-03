'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    
    try {
      const { requestPasswordReset } = await import('@/lib/auth-actions')
      const result = await requestPasswordReset(email)
      
      if (result.success) {
        setStatus('success')
        setMessage(result.message || 'If an account exists with this email, a reset link has been sent.')
      } else {
        setStatus('error')
        setMessage(result.error || 'Something went wrong')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Failed to send request')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="size-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-2xl shadow-xl shadow-primary/20 transition-transform group-hover:scale-110">
              S
            </div>
            <span className="font-bold text-2xl tracking-tight">SmartTask</span>
          </Link>
        </div>

        <Card className="shadow-2xl border-border/50 bg-background/80 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <div className="mb-2">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                <ChevronLeft className="size-4" />
                Back to login
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email and we&apos;ll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'success' ? (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-start gap-3">
                <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{message}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-muted/30 h-11"
                    disabled={status === 'loading'}
                  />
                </div>

                {status === 'error' && (
                  <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    {message}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 font-bold shadow-lg shadow-primary/20" disabled={status === 'loading'}>
                  {status === 'loading' ? "Sending link..." : "Send Reset Link"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-center text-sm text-muted-foreground w-full">
              Remembered your password?{" "}
              <Link href="/login" className="font-bold text-primary hover:underline transition-colors">
                Log in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
