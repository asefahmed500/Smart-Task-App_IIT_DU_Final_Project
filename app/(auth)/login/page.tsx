'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(data.error || 'Invalid email or password')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
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
            <CardTitle className="text-lg font-semibold text-[#1A1A1A] text-center">Welcome back</CardTitle>
            <CardDescription className="text-sm text-[#5A5A5A] text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[13px] font-medium text-[#1A1A1A]">Password</Label>
                  <Link href="/forgot-password" className="text-[13px] font-medium text-[#2C67F2] hover:text-[#2558d6] transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 text-sm border-[#E8E8E8] bg-white placeholder:text-[#B0B0B0]"
                />
              </div>

              {error && (
                <div className="p-3 text-[13px] text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-10 text-sm font-medium bg-[#2C67F2] text-white hover:bg-[#2558d6]" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="border-t border-[#E8E8E8] pt-4 justify-center">
            <p className="text-[13px] text-[#5A5A5A]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-[#2C67F2] hover:text-[#2558d6] transition-colors">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
