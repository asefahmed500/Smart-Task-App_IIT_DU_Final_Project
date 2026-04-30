'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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

function RegisterFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const resend = searchParams?.get('resend') === 'true'

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: data.name, 
          email: data.email,
          password: data.password
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error('Registration failed', {
          description: result.error || 'Could not create account',
        })
        return
      }

      toast.success('Account created!', {
        description: `Welcome ${data.name}. Please verify your email to continue.`,
      })

      // Redirect to verification page with email parameter
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch (error) {
      toast.error('Registration failed', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

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
            setIsLoading(true)
            try {
              const response = await fetch('/api/auth/send-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email }),
              })

              if (response.ok) {
                toast.success('Verification email sent!', {
                  description: 'Check your inbox for the verification code.',
                })
                router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
              } else {
                const result = await response.json()
                toast.error('Failed to send verification email', {
                  description: result.error || 'Please try again later.',
                })
              }
            } catch (error) {
              toast.error('Failed to send verification email', {
                description: 'Please try again later.',
              })
            } finally {
              setIsLoading(false)
            }
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
          autoComplete="name"
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
          autoComplete="email"
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
          autoComplete="new-password"
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
        We'll send you a verification code to set your password
      </p>
    </form>
  )
}

export default function RegisterForm() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4">
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-200 rounded" />
    </div>}>
      <RegisterFormContent />
    </Suspense>
  )
}
