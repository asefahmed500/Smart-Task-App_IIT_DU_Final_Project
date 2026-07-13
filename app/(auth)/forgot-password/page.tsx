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
      const { requestPasswordReset } = await import('@/actions/auth-actions')
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

        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="pb-4">
            <div className="mb-2">
              <Link href="/login" className="text-[13px] text-[#5A5A5A] hover:text-[#1A1A1A] flex items-center gap-1 transition-colors">
                <ChevronLeft className="size-3.5" />
                Back to login
              </Link>
            </div>
            <CardTitle className="text-lg font-semibold text-[#1A1A1A] text-center">Reset Password</CardTitle>
            <CardDescription className="text-sm text-[#5A5A5A] text-center">
              Enter your email and we&apos;ll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'success' ? (
              <div className="p-4 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] flex items-start gap-3">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <p className="text-[13px] font-medium">{message}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[13px] font-medium text-[#1A1A1A]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-sm border-[#E8E8E8] bg-white placeholder:text-[#B0B0B0]"
                    disabled={status === 'loading'}
                  />
                </div>

                {status === 'error' && (
                  <div className="p-3 text-[13px] text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-center gap-2">
                    <AlertCircle className="size-3.5 shrink-0" />
                    {message}
                  </div>
                )}

                <Button type="submit" className="w-full h-10 text-sm font-medium bg-[#2C67F2] text-white hover:bg-[#2558d6]" disabled={status === 'loading'}>
                  {status === 'loading' ? "Sending link..." : "Send Reset Link"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="border-t border-[#E8E8E8] pt-4 justify-center">
            <p className="text-[13px] text-[#5A5A5A]">
              Remembered your password?{" "}
              <Link href="/login" className="font-semibold text-[#2C67F2] hover:text-[#2558d6] transition-colors">
                Log in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
