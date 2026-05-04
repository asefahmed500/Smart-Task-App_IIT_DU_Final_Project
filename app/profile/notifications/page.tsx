'use client'

import { useState, useEffect } from 'react'
import { getNotificationPreferences, updateNotificationPreferences } from '@/actions/notification-preferences-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Bell, Mail, Smartphone } from 'lucide-react'

interface NotificationPrefs {
  taskAssigned: boolean
  statusChanged: boolean
  commentMention: boolean
  automationTriggered: boolean
  dueDateReminder: boolean
  overdueReminder: boolean
  reviewRequested: boolean
  reviewCompleted: boolean
  emailEnabled: boolean
  pushEnabled: boolean
}

const PREF_LABELS: Record<keyof NotificationPrefs, { label: string; icon: React.ReactNode }> = {
  taskAssigned: { label: 'Task Assigned', icon: <Bell className="size-4" /> },
  statusChanged: { label: 'Status Changed', icon: <Bell className="size-4" /> },
  commentMention: { label: 'Comment Mention', icon: <Bell className="size-4" /> },
  automationTriggered: { label: 'Automation Triggered', icon: <Bell className="size-4" /> },
  dueDateReminder: { label: 'Due Date Reminder', icon: <Bell className="size-4" /> },
  overdueReminder: { label: 'Overdue Reminder', icon: <Bell className="size-4" /> },
  reviewRequested: { label: 'Review Requested', icon: <Bell className="size-4" /> },
  reviewCompleted: { label: 'Review Completed', icon: <Bell className="size-4" /> },
  emailEnabled: { label: 'Email Notifications', icon: <Mail className="size-4" /> },
  pushEnabled: { label: 'Push Notifications', icon: <Smartphone className="size-4" /> },
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getNotificationPreferences().then((res) => {
      if (res.success && res.data) {
        setPrefs(res.data as NotificationPrefs)
      }
      setLoading(false)
    })
  }, [])

  const handleToggle = async (key: keyof NotificationPrefs) => {
    if (!prefs) return
    const updated = { ...prefs, [key]: !prefs[key] }
    setPrefs(updated)
    setSaving(true)
    const result = await updateNotificationPreferences({ [key]: updated[key] })
    setSaving(false)
    if (result.success) {
      toast.success('Preference updated')
    } else {
      toast.error(result.error || 'Failed to update')
      setPrefs(prefs) // revert
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <Card>
          <CardContent className="p-6">
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              Loading preferences...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!prefs) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <Card>
          <CardContent className="p-6">
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              Failed to load preferences.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-oswald uppercase tracking-wider">
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              In-App Notifications
            </h3>
            <div className="space-y-2">
              {(Object.keys(PREF_LABELS) as Array<keyof NotificationPrefs>)
                .filter((k) => k !== 'emailEnabled' && k !== 'pushEnabled')
                .map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-b border-primary/5 last:border-0"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {PREF_LABELS[key].icon}
                      {PREF_LABELS[key].label}
                    </div>
                    <Switch
                      checked={prefs[key]}
                      onCheckedChange={() => handleToggle(key)}
                      disabled={saving}
                    />
                  </div>
                ))}
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Delivery Channels
            </h3>
            <div className="space-y-2">
              {(['emailEnabled', 'pushEnabled'] as const).map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 border-b border-primary/5 last:border-0"
                >
                  <div className="flex items-center gap-2 text-sm">
                    {PREF_LABELS[key].icon}
                    {PREF_LABELS[key].label}
                  </div>
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={() => handleToggle(key)}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
