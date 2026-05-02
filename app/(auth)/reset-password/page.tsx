'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { resetPassword } from '@/lib/auth-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Loader2, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (!token) {
      toast.error('Missing reset token')
      router.push('/login')
    }
  }, [token, router])

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    if (!token) return

    setIsLoading(true)
    try {
      const result = await resetPassword(token, values.password)
      if (result.success) {
        toast.success(result.message || 'Password reset successful')
        router.push('/login')
      } else {
        toast.error(result.error || 'Failed to reset password')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    {...field} 
                    className="bg-background/50 border-primary/10 focus:border-primary/30 h-11 pr-10" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Confirm Password</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  {...field} 
                  className="bg-background/50 border-primary/10 focus:border-primary/30 h-11" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full h-11 font-oswald uppercase tracking-wider text-base mt-4 shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px] active:translate-y-[0px]">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/40 backdrop-blur-xl border-primary/10 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-oswald uppercase tracking-tight">
            Reset <span className="text-primary">Password</span>
          </CardTitle>
          <CardDescription>
            Choose a strong password to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-primary/5 pt-6 mt-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
            Back to Login
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
