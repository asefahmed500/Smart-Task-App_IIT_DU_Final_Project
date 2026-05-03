'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token || !email) {
      setStatus('error')
      setMessage('Invalid or missing reset link. Please request a new one.')
    }
  }, [token, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters long')
      return
    }

    setStatus('loading')
    
    try {
      const { resetPassword } = await import('@/lib/auth-actions')
      const result = await resetPassword(token as string, password)
      
      if (result.success) {
        setStatus('success')
        setMessage(result.message || 'Password has been successfully reset')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(result.error || 'Something went wrong')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Failed to reset password')
    }
  }

  return (
    <Card className="shadow-2xl border-border/50 bg-background/80 backdrop-blur-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">New Password</CardTitle>
        <CardDescription className="text-center">
          Please enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="size-10" />
            <div>
              <p className="text-sm font-bold">Password Reset Successful!</p>
              <p className="text-xs mt-1">Redirecting you to login in a few seconds...</p>
            </div>
            <Button variant="outline" className="mt-2 w-full border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-500" asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-muted/30 h-11 pr-10"
                  disabled={status === 'loading' || !token}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-muted/30 h-11"
                disabled={status === 'loading' || !token}
              />
            </div>

            {status === 'error' && (
              <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                {message}
              </div>
            )}

            <Button type="submit" className="w-full h-11 font-bold shadow-lg shadow-primary/20" disabled={status === 'loading' || !token}>
              {status === 'loading' ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-center text-sm text-muted-foreground w-full">
          Changed your mind?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline transition-colors">
            Back to login
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function ResetPasswordPage() {
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

        <Suspense fallback={
          <Card className="shadow-2xl border-border/50 bg-background/80 backdrop-blur-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-center">Loading...</CardTitle>
            </CardHeader>
            <CardContent className="h-32 flex items-center justify-center">
              <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </CardContent>
          </Card>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
