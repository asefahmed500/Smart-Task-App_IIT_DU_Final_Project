'use client'

import { useState } from 'react'
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
import { requestPasswordReset } from '@/lib/auth-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true)
    try {
      const result = await requestPasswordReset(values.email)
      if (result.success) {
        setIsSent(true)
        toast.success('Reset link sent to your email')
      } else {
        toast.error(result.error || 'Failed to send reset link')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/40 backdrop-blur-xl border-primary/10 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Mail className="size-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-oswald uppercase tracking-tight">
            Forgot <span className="text-primary">Password?</span>
          </CardTitle>
          <CardDescription>
            {isSent 
              ? "We've sent a recovery link to your email address." 
              : "No worries! Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Please check your inbox (and spam folder) for the reset instructions.
              </p>
              <Button asChild variant="outline" className="w-full font-oswald uppercase tracking-wider">
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="name@example.com" 
                          {...field} 
                          className="bg-background/50 border-primary/10 focus:border-primary/30 h-11" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full h-11 font-oswald uppercase tracking-wider text-base mt-2 shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px] active:translate-y-[0px]">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-primary/5 pt-6 mt-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
