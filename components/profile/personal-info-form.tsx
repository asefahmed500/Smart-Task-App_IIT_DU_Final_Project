'use client'

import { useGetProfileQuery, useUpdateProfileMutation } from '@/lib/slices/usersApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'

export default function PersonalInfoForm() {
  const { data: profile } = useGetProfileQuery()
  const [updateProfile, { isLoading }] = useUpdateProfileMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{
    name: string
    email: string
  }>()

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        email: profile.email,
      })
    }
  }, [profile, reset])

  const onSubmit = async (data: { name: string; email: string }) => {
    try {
      await updateProfile({ name: data.name }).unwrap()
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  if (!profile) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={profile.email} disabled />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact admin if needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={profile.role} disabled />
            <p className="text-xs text-muted-foreground">
              Role is assigned by your administrator.
            </p>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
