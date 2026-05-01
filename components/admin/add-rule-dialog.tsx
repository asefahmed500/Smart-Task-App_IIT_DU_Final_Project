'use client'

import { useState } from "react"
import { Plus, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createAutomationRule } from "@/lib/admin-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function AddRuleDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      trigger: formData.get('trigger') as string,
      action: formData.get('action') as string,
      condition: formData.get('condition') as string,
    }

    try {
      await createAutomationRule(data)
      toast.success("Automation rule created successfully")
      setOpen(false)
      router.refresh()
    } catch {
      toast.error("Failed to create rule")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-oswald uppercase gap-2 shadow-lg shadow-primary/20">
          <Plus className="size-4" />
          Create Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-primary/20">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-oswald uppercase flex items-center gap-2">
              <Zap className="size-6 text-primary" />
              New <span className="text-primary">Automation</span> Rule
            </DialogTitle>
            <DialogDescription>
              Define a system-wide trigger and action to automate your workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Auto-Archive Finished Tasks"
                required
                className="bg-muted/50 border-primary/10 focus-visible:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="trigger">Trigger Event</Label>
                <Select name="trigger" required>
                  <SelectTrigger className="bg-muted/50 border-primary/10">
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TASK_CREATED">Task Created</SelectItem>
                    <SelectItem value="TASK_MOVED">Task Moved</SelectItem>
                    <SelectItem value="TASK_COMPLETED">Task Completed</SelectItem>
                    <SelectItem value="MEMBER_JOINED">Member Joined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="action">Resulting Action</Label>
                <Select name="action" required>
                  <SelectTrigger className="bg-muted/50 border-primary/10">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEND_NOTIFICATION">Send Notification</SelectItem>
                    <SelectItem value="ASSIGN_DEFAULT_MEMBER">Assign Member</SelectItem>
                    <SelectItem value="MOVE_TO_COLUMN">Move to Column</SelectItem>
                    <SelectItem value="LOG_TO_SYSTEM">Log to System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="condition">Condition (Optional)</Label>
              <Input
                id="condition"
                name="condition"
                placeholder="e.g., if priority == HIGH"
                className="bg-muted/50 border-primary/10 focus-visible:ring-primary font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? "Creating..." : "Save Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
