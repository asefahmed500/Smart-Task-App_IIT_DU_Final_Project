'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function VerifyEmailSentPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-medium mb-2">Check Your Email</h1>
        <p className="text-gray-600 mb-6">
          We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
        </p>
        <div className="space-y-3">
          <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
            Go to Login
          </Button>
          <Button
            onClick={() => router.push('/register?resend=true')}
            variant="ghost"
            className="w-full"
          >
            Resend Verification Email
          </Button>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Didn't receive the email? Check your spam folder or request a new one.
        </p>
      </Card>
    </div>
  )
}
