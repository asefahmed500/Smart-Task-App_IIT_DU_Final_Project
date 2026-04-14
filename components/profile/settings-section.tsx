'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppSelector } from '@/lib/hooks'
import { setTheme } from '@/lib/slices/uiSlice'
import { useAppDispatch } from '@/lib/hooks'
import { useState } from 'react'
import { toast } from 'sonner'

export default function SettingsSection() {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)

  const handleThemeChange = (value: string) => {
    dispatch(setTheme(value as 'light' | 'dark' | 'system'))
  }

  const handleSaveSettings = () => {
    toast.success('Settings saved successfully')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme */}
        <div className="space-y-2">
          <Label>Theme</Label>
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <Label>Notifications</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="font-normal">
                Email notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive email updates about your tasks
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="font-normal">
                Push notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive browser push notifications
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label>Password</Label>
          <Button variant="outline" className="w-full">
            Change Password
          </Button>
        </div>

        <Button onClick={handleSaveSettings}>Save Settings</Button>
      </CardContent>
    </Card>
  )
}
