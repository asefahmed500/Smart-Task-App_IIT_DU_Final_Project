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
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type EmailFormValues = z.infer<typeof emailSchema>

function VerifyEmailSentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email },
  })

  const onSubmit = async (data: EmailFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      if (response.ok) {
        toast.success('Verification code sent!', {
          description: 'Check your email for the 6-digit code',
        })
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
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
      <Card className="w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
        <p className="text-gray-600 mb-6">
          We've sent a 6-digit verification code to your email address.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
          <div className="space-y-2 text-left">
            <Label htmlFor="email">Enter your email to get the code again:</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              defaultValue={email}
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
                Sending...
              </>
            ) : (
              'Get Verification Code'
            )}
          </Button>
        </form>

        <div className="space-y-3">
          <Button
            onClick={() => router.push(`/verify-email?email=${encodeURIComponent(email)}`)}
            variant="default"
            className="w-full"
          >
            Enter Verification Code
          </Button>
          <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
            Back to Login
          </Button>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Didn't receive the email? Check your spam folder or request a new one above.
        </p>
      </Card>
    </div>
  )
}

export default function VerifyEmailSentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    }>
      <VerifyEmailSentContent />
    </Suspense>
  )
}
