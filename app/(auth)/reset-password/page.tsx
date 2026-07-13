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

    if (password.length < 6) {
      setStatus('error')
      setMessage('Password must be at least 6 characters long')
      return
    }

    setStatus('loading')
    
    try {
      const { resetPassword } = await import('@/actions/auth-actions')
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
    <Card className="border border-[#E8E8E8] shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-[#1A1A1A] text-center">New Password</CardTitle>
        <CardDescription className="text-sm text-[#5A5A5A] text-center">
          Please enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' ? (
          <div className="p-4 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="size-8" />
            <div>
              <p className="text-[13px] font-semibold">Password Reset Successful!</p>
              <p className="text-[12px] mt-1 text-[#16A34A]/80">Redirecting you to login in a few seconds...</p>
            </div>
            <Button variant="outline" className="mt-2 w-full border-[#BBF7D0] hover:bg-[#F0FDF4] text-[#16A34A] h-9 text-sm" asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium text-[#1A1A1A]">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 text-sm border-[#E8E8E8] bg-white placeholder:text-[#B0B0B0] pr-10"
                  disabled={status === 'loading' || !token}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A5A5A] hover:text-[#1A1A1A] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-[#1A1A1A]">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 text-sm border-[#E8E8E8] bg-white placeholder:text-[#B0B0B0]"
                disabled={status === 'loading' || !token}
              />
            </div>

            {status === 'error' && (
              <div className="p-3 text-[13px] text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-center gap-2">
                <AlertCircle className="size-3.5 shrink-0" />
                {message}
              </div>
            )}

            <Button type="submit" className="w-full h-10 text-sm font-medium bg-[#2C67F2] text-white hover:bg-[#2558d6]" disabled={status === 'loading' || !token}>
              {status === 'loading' ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="border-t border-[#E8E8E8] pt-4 justify-center">
        <p className="text-[13px] text-[#5A5A5A]">
          Changed your mind?{" "}
          <Link href="/login" className="font-semibold text-[#2C67F2] hover:text-[#2558d6] transition-colors">
            Back to login
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-[#2C67F2] flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="text-sm font-semibold text-[#1A1A1A] tracking-tight">SmartTask</span>
          </Link>
        </div>

        <Suspense fallback={
          <Card className="border border-[#E8E8E8] shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-[#1A1A1A] text-center">Loading...</CardTitle>
            </CardHeader>
            <CardContent className="h-24 flex items-center justify-center">
              <div className="size-5 rounded-full border-2 border-[#E8E8E8] border-t-[#2C67F2] animate-spin"></div>
            </CardContent>
          </Card>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
