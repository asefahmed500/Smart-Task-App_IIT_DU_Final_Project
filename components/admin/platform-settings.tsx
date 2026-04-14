'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useGetSystemSettingsQuery, useUpdateSystemSettingsMutation } from '@/lib/slices/adminApi'
import { toast } from 'sonner'
import { Settings, Save, Loader2, Globe, ShieldCheck, Palette } from 'lucide-react'

export default function PlatformSettings() {
  const { data: settings, isLoading } = useGetSystemSettingsQuery()
  const [updateSettings, { isLoading: isUpdating }] = useUpdateSystemSettingsMutation()

  const [formData, setFormData] = useState({
    platformName: '',
    allowMemberBoardCreation: true,
    defaultWipLimit: 5,
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        platformName: settings.platformName,
        allowMemberBoardCreation: settings.allowMemberBoardCreation,
        defaultWipLimit: settings.defaultWipLimit,
      })
    }
  }, [settings])

  const handleSave = async () => {
    try {
      await updateSettings(formData).unwrap()
      toast.success('System settings updated successfully')
    } catch {
      toast.error('Failed to update settings')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Branding */}
        <Card className="border-[rgba(0,0,0,0.08)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-body-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Branding & Identity
            </CardTitle>
            <CardDescription>Customize the global look and feel of the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={formData.platformName}
                onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                placeholder="e.g. SmartTask Enterprise"
              />
            </div>
            <div className="pt-2">
               <p className="text-xs text-muted-foreground italic">
                 Note: This changes the title displayed in the browser and landing page.
               </p>
            </div>
          </CardContent>
        </Card>

        {/* Governance Rules */}
        <Card className="border-[rgba(0,0,0,0.08)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-body-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Governance & Access
            </CardTitle>
            <CardDescription>Define how users interact with the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Member Board Creation</Label>
                <p className="text-xs text-muted-foreground">Allow regular members to create new workspace boards.</p>
              </div>
              <Switch
                checked={formData.allowMemberBoardCreation}
                onCheckedChange={(v) => setFormData({ ...formData, allowMemberBoardCreation: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wipLimit">Default Column WIP Limit</Label>
              <Input
                id="wipLimit"
                type="number"
                value={formData.defaultWipLimit}
                onChange={(e) => setFormData({ ...formData, defaultWipLimit: parseInt(e.target.value) })}
                min={1}
                max={99}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isUpdating}
          className="rounded-[9999px] px-8 py-6 h-auto text-body-medium font-waldenburg font-light"
        >
          {isUpdating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Save Platform Configuration
        </Button>
      </div>
    </div>
  )
}
