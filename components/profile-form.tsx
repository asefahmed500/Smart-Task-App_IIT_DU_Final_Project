'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { updateUserProfile } from '@/lib/admin-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Camera, Mail, Shield, Calendar } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  image: z.string().optional(),
})

interface UserProfile {
  id: string
  name: string | null
  email: string
  role: string
  image: string | null
  createdAt: Date
}

export function ProfileForm({ user }: { user: UserProfile | null }) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      image: user?.image || '',
    },
  })

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    setIsLoading(true)
    try {
      await updateUserProfile(values)
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <Card className="md:col-span-1 bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
        <CardHeader className="text-center">
          <div className="relative mx-auto size-32 rounded-full border-4 border-primary/20 p-1 group-hover:border-primary/40 transition-all duration-500">
            <Avatar className="size-full">
              <AvatarImage src={user?.image || undefined} />
              <AvatarFallback className="text-2xl font-oswald bg-primary/10 text-primary">
                {user?.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="size-6 text-white" />
            </div>
          </div>
          <CardTitle className="mt-4 font-oswald uppercase text-xl">{user?.name}</CardTitle>
          <CardDescription className="uppercase tracking-widest text-[10px] font-bold text-primary">{user?.role}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 border-t border-primary/5">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground truncate">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground capitalize">{user?.role.toLowerCase()} Privileges</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
        <CardHeader>
          <CardTitle className="font-oswald uppercase text-xl">Profile Settings</CardTitle>
          <CardDescription>Update your personal information and account preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormDescription>
                      This is your public display name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/avatar.png" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormDescription>
                      Provide a URL to your profile image.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto font-oswald uppercase tracking-wider">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
