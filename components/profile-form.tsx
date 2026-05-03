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
import { updateProfile, changePassword } from '@/lib/auth-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Camera, Mail, Shield, Calendar, Lock, Eye, EyeOff } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const profileSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  image: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
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
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      image: user?.image || '',
    },
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    setIsProfileLoading(true)
    try {
      const result = await updateProfile(values)
      if (result.success) {
        toast.success('Profile updated successfully')
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsProfileLoading(false)
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsPasswordLoading(true)
    try {
      const result = await changePassword(values)
      if (result.success) {
        toast.success('Password updated successfully')
        passwordForm.reset()
      } else {
        toast.error(result.error || 'Failed to update password')
      }
    } catch {
      toast.error('Failed to update password')
    } finally {
      setIsPasswordLoading(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-6">
        <Card className="bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
          <CardHeader className="text-center">
            <div className="relative mx-auto size-32 rounded-full border-4 border-primary/20 p-1 group-hover:border-primary/40 transition-all duration-500">
              <Avatar className="size-full">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback className="text-2xl font-oswald bg-primary/10 text-primary uppercase">
                  {user?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="size-6 text-white" />
              </div>
            </div>
            <CardTitle className="mt-4 font-oswald uppercase text-xl truncate">{user?.name}</CardTitle>
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold text-primary">{user?.role}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 border-t border-primary/5">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="size-4 text-primary/60" />
              <span className="text-muted-foreground truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="size-4 text-primary/60" />
              <span className="text-muted-foreground capitalize">{user?.role.toLowerCase()} Privileges</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="size-4 text-primary/60" />
              <span className="text-muted-foreground">Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden relative">
          <CardHeader>
            <CardTitle className="font-oswald uppercase text-lg flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500">
              Your account is active and secure.
            </div>
            <p className="text-muted-foreground leading-relaxed">
              As a <strong>{user?.role}</strong>, you have access to specific features according to your role. Keep your password confidential.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
          <CardHeader>
            <CardTitle className="font-oswald uppercase text-xl">Profile Settings</CardTitle>
            <CardDescription>Update your personal information and account preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="bg-background/50 border-primary/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Avatar URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/avatar.png" {...field} className="bg-background/50 border-primary/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={isProfileLoading} className="font-oswald uppercase tracking-wider px-8 shadow-lg shadow-primary/20">
                  {isProfileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
          <CardHeader>
            <CardTitle className="font-oswald uppercase text-xl flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              Security Settings
            </CardTitle>
            <CardDescription>Change your password to keep your account secure.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showCurrentPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            {...field} 
                            className="bg-background/50 border-primary/10 pr-10" 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator className="bg-primary/5" />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showNewPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                              className="bg-background/50 border-primary/10 pr-10" 
                            />
                            <button 
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="bg-background/50 border-primary/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={isPasswordLoading} variant="outline" className="font-oswald uppercase tracking-wider border-primary/20 hover:bg-primary/5">
                  {isPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
