'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRegisterMutation } from '@/lib/slices/authApi'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [registerMutation, { isLoading }] = useRegisterMutation()
  const [sendingVerification, setSendingVerification] = useState(false)
  const resend = searchParams.get('resend') === 'true'

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const sendVerificationEmail = async (email: string) => {
    setSendingVerification(true)
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Verification email sent!', {
          description: 'Check your inbox for the verification link.',
        })
        return true
      } else {
        toast.error('Failed to send verification email', {
          description: data.error || 'Please try again later.',
        })
        return false
      }
    } catch (error) {
      toast.error('Failed to send verification email', {
        description: 'Please try again later.',
      })
      return false
    } finally {
      setSendingVerification(false)
    }
  }

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const result = await registerMutation(data).unwrap()

      toast.success('Account created!', {
        description: `Welcome ${result.user.name}. Please verify your email.`,
      })

      // Send verification email
      await sendVerificationEmail(data.email)

      // Redirect to email verification page
      router.push('/verify-email-sent')
    } catch (error: any) {
      toast.error('Registration failed', {
        description: error.data?.error || 'Could not create account',
      })
    }
  }

  // Handle resend verification email
  if (resend) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">
            Need a new verification email? Enter your email address below.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(async (data) => {
            await sendVerificationEmail(data.email)
            router.push('/verify-email-sent')
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...registerField('email')}
              disabled={sendingVerification}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={sendingVerification}>
            {sendingVerification ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Verification Email'
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-sm text-gray-600 hover:text-black transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          placeholder="John Doe"
          {...registerField('name')}
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...registerField('email')}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...registerField('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      <p className="text-xs text-center text-gray-500">
        By signing up, you agree to receive email verification
      </p>
    </form>
  )
}
