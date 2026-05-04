'use client'

import { useState, useEffect } from "react"
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
import { createAutomationRule } from '@/actions/admin-actions'
import { getManagerBoards } from '@/actions/manager-actions'
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getAvailableTriggers, getAvailableConditions, getAvailableActions } from '@/utils/automation-utils'

interface BoardOption {
  id: string
  name: string
}

export function AddRuleDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [boards, setBoards] = useState<BoardOption[]>([])
  const router = useRouter()

  const triggers = getAvailableTriggers()
  const conditions = getAvailableConditions()
  const actions = getAvailableActions()

  useEffect(() => {
    if (open) {
      getManagerBoards().then((res) => {
        if (res.success && res.data) {
          setBoards(res.data as BoardOption[])
        }
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const boardId = formData.get('boardId') as string
    const data = {
      name: formData.get('name') as string,
      trigger: formData.get('trigger') as string,
      action: formData.get('action') as string,
      condition: formData.get('condition') as string,
      boardId: boardId === 'global' ? null : boardId,
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
                placeholder="e.g., Auto-notify on High Priority"
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
                    {triggers.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
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
                    {actions.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="condition">Condition (Optional)</Label>
              <Select name="condition">
                <SelectTrigger className="bg-muted/50 border-primary/10">
                  <SelectValue placeholder="No condition (always run)" />
                </SelectTrigger>
                <SelectContent>
                  {conditions.filter(c => c.value).map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="boardId">Scope</Label>
              <Select name="boardId" defaultValue="global">
                <SelectTrigger className="bg-muted/50 border-primary/10">
                  <SelectValue placeholder="Global (all boards)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (all boards)</SelectItem>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
