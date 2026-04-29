'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const verifySchema = z.object({
  code: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits'),
})

type VerifyFormValues = z.infer<typeof verifySchema>

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''

  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
  })

  const onSubmit = async (data: VerifyFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: data.code,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setStatus('success')
        toast.success('Email verified successfully!', {
          description: 'Redirecting to set your password...',
        })

        // Redirect to set password page
        setTimeout(() => {
          router.push(`/set-password?email=${encodeURIComponent(email)}`)
        }, 1500)
      } else {
        setStatus('error')
        toast.error('Verification failed', {
          description: result.error || 'Invalid or expired code',
        })
      }
    } catch {
      setStatus('error')
      toast.error('An error occurred', {
        description: 'Please try again later',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        toast.success('Verification code sent!', {
          description: 'Check your email for the new code',
        })
      } else {
        const result = await response.json()
        toast.error('Failed to send code', {
          description: result.error || 'Please try again',
        })
      }
    } catch {
      toast.error('An error occurred', {
        description: 'Please try again later',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            Enter the 6-digit code sent to<br />
            <span className="font-medium">{email}</span>
          </p>
        </div>

        {status === 'idle' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                autoFocus
                {...register('code')}
                disabled={isLoading}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="text-sm text-gray-600 hover:text-black underline"
              >
                Didn't receive a code? Resend
              </button>
            </div>
          </form>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-6">
              Redirecting you to set your password...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
            <p className="text-gray-600">
              Invalid or expired code. Please try again.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => setStatus('idle')}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={handleResend}
                disabled={isLoading}
                variant="ghost"
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Resend Code'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
