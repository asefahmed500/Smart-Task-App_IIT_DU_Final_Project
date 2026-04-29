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
import { Loader2, Lock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const codeSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
})

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type CodeFormValues = z.infer<typeof codeSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''
  const [step, setStep] = useState<'code' | 'password'>('code')
  const [isLoading, setIsLoading] = useState(false)
  const [verifiedEmail, setVerifiedEmail] = useState('')

  const {
    register: registerCode,
    handleSubmit: handleSubmitCode,
    formState: { errors: codeErrors },
  } = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  })

  const onCodeSubmit = async (data: CodeFormValues) => {
    if (!email) {
      toast.error('Email missing', {
        description: 'Please start the forgot password process again',
      })
      router.push('/forgot-password')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: data.code,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setVerifiedEmail(email)
        setStep('password')
        toast.success('Code verified!', {
          description: 'Now set your new password',
        })
      } else {
        toast.error('Invalid code', {
          description: result.error || 'Please check and try again',
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

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifiedEmail,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Password reset successfully!', {
          description: 'You can now login with your new password',
        })
        router.push('/login')
      } else {
        toast.error('Failed to reset password', {
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
        {step === 'code' ? (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-center">Enter Reset Code</h1>
            <p className="text-gray-600 mb-6 text-center">
              Enter the 6-digit code sent to {email || 'your email'}
            </p>

            <form onSubmit={handleSubmitCode(onCodeSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Reset Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  {...registerCode('code')}
                  disabled={isLoading}
                />
                {codeErrors.code && (
                  <p className="text-sm text-destructive">{codeErrors.code.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-2">
              <Button
                onClick={() => router.push(`/forgot-password?email=${encodeURIComponent(email)}`)}
                variant="outline"
                className="w-full"
              >
                Resend Code
              </Button>
              <Button
                onClick={() => router.push('/login')}
                variant="ghost"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-center">Set New Password</h1>
            <p className="text-gray-600 mb-6 text-center">
              Enter your new password below
            </p>

            <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...registerPassword('password')}
                  disabled={isLoading}
                />
                {passwordErrors.password && (
                  <p className="text-sm text-destructive">{passwordErrors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...registerPassword('confirmPassword')}
                  disabled={isLoading}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>

            <div className="mt-6">
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
