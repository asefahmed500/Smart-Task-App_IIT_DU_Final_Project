'use client'

import { useState } from 'react'
import {
  useGetBoardWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  Webhook
} from '@/lib/slices/boardsApi'
import { useGetSessionQuery } from '@/lib/use-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Activity,
  Loader2,
  Check,
  X,
  Settings2
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const WEBHOOK_EVENTS = [
  { id: 'TASK_MOVED', label: 'Task Moved' },
  { id: 'TASK_ASSIGNED', label: 'Task Assigned' },
  { id: 'COMMENT_ADDED', label: 'Comment Added' },
  { id: 'TASK_BLOCKED', label: 'Task Blocked' },
  { id: 'TASK_UNBLOCKED', label: 'Task Unblocked' },
  { id: 'AUTOMATION_TRIGGER', label: 'Automation Fired' },
]

interface WebhookSettingsProps {
  boardId: string
}

export default function WebhookSettings({ boardId }: WebhookSettingsProps) {
  const { data: session } = useGetSessionQuery()
  const canManage = session?.role === 'ADMIN' || session?.role === 'MANAGER'

  const { data: webhooks, isLoading } = useGetBoardWebhooksQuery(boardId)
  const [createWebhook, { isLoading: isCreating }] = useCreateWebhookMutation()
  const [updateWebhook] = useUpdateWebhookMutation()
  const [deleteWebhook] = useDeleteWebhookMutation()

  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as string[]
  })

  const handleCreate = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error('Please fill all required fields and select at least one event')
      return
    }

    try {
      await createWebhook({
        boardId,
        ...formData
      }).unwrap()
      toast.success('Webhook created')
      setIsAdding(false)
      setFormData({ name: '', url: '', secret: '', events: [] })
    } catch (err) {
      toast.error('Failed to create webhook')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhook(id).unwrap()
      toast.success('Webhook deleted')
    } catch (err) {
      toast.error('Failed to delete webhook')
    }
  }

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight">External Integrations</h3>
          <p className="text-sm text-muted-foreground">Receive real-time payloads when events happen on this board.</p>
        </div>
        {!isAdding && canManage && (
          <Button onClick={() => setIsAdding(true)} className="rounded-full gap-2 shadow-sm font-bold">
            <Plus className="h-4 w-4" />
            Add Webhook
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="p-6 border-2 border-primary/10 bg-primary/5 rounded-[24px] space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Friendly Name</Label>
              <Input 
                placeholder="e.g. Production Slack Bot" 
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Target URL</Label>
              <Input 
                placeholder="https://hooks.example.com/..." 
                value={formData.url}
                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="font-bold">Secret (Optional HMAC SHA-256 key)</Label>
            <Input 
              type="password"
              placeholder="Keep it secret, keep it safe" 
              value={formData.secret}
              onChange={e => setFormData(prev => ({ ...prev, secret: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-3">
            <Label className="font-bold">Events to Subscribe</Label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map(event => (
                <div key={event.id} className="flex items-center space-x-2 bg-background/50 p-2 rounded-lg border border-black/5">
                  <Checkbox 
                    id={event.id} 
                    checked={formData.events.includes(event.id)}
                    onCheckedChange={() => toggleEvent(event.id)}
                  />
                  <label htmlFor={event.id} className="text-sm font-medium leading-none cursor-pointer">
                    {event.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAdding(false)} className="rounded-full px-6">Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating} className="rounded-full px-6 font-bold shadow-lg">
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Webhook
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {webhooks?.length === 0 && !isAdding ? (
          <div className="text-center py-12 border-2 border-dashed rounded-[32px] bg-muted/30">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No webhooks configured yet.</p>
          </div>
        ) : (
          webhooks?.map((webhook) => (
            <Card key={webhook.id} className="p-5 rounded-[24px] border border-black/5 hover:border-black/10 transition-all hover:shadow-md group relative overflow-hidden">
               <div className="flex items-start justify-between relative z-10">
                 <div className="flex gap-4">
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center",
                     webhook.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                   )}>
                     <Globe className="h-6 w-6" />
                   </div>
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <h4 className="font-bold text-base">{webhook.name}</h4>
                       {!webhook.isActive && <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-[10px] font-bold">INACTIVE</Badge>}
                       {webhook.secret && <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                     </div>
                     <p className="text-sm text-muted-foreground font-mono flex items-center gap-1.5 truncate max-w-[400px]">
                       <ExternalLink className="h-3 w-3" />
                       {webhook.url}
                     </p>
                     <div className="flex flex-wrap gap-1.5 mt-2">
                       {webhook.events.map(event => (
                         <Badge key={event} variant="outline" className="text-[10px] py-0 px-2 rounded-full border-black/10 bg-black/[0.02]">
                           {event.replace('_', ' ')}
                         </Badge>
                       ))}
                     </div>
                   </div>
                 </div>

                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full h-8 w-8"
                          onClick={() => updateWebhook({ id: webhook.id, isActive: !webhook.isActive })}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                 </div>
               </div>
               
               {/* Activity line chart placeholder/sparkline effect */}
               <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5" />
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
