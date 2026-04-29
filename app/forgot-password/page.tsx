'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Loader2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type EmailFormValues = z.infer<typeof emailSchema>

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  })

  const onSubmit = async (data: EmailFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setEmailSent(true)
        toast.success('Reset code sent!', {
          description: 'Check your email for the 6-digit code',
        })
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(data.email)}`)
        }, 2000)
      } else {
        toast.error('Failed to send reset code', {
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
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">Forgot Password?</h1>
        <p className="text-gray-600 mb-6 text-center">
          Enter your email address and we'll send you a 6-digit code to reset your password.
        </p>

        {!emailSent ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                'Send Reset Code'
              )}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">Check your email!</p>
              <p className="text-green-600 text-sm mt-1">
                Redirecting to reset page...
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <Button
            onClick={() => router.push('/login')}
            variant="outline"
            className="w-full"
          >
            Back to Login
          </Button>
          <p className="text-sm text-gray-500">
            Remember your password?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </Card>
    </div>
  )
}
