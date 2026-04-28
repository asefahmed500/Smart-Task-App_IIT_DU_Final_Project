'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useCreateBoardMutation } from '@/lib/slices/boardsApi'
import { toast } from 'sonner'
import { LayoutDashboard, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBoardPage() {
  const router = useRouter()
  const [createBoard, { isLoading }] = useCreateBoardMutation()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#000000',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Board name is required')
      return
    }

    try {
      const result = await createBoard(formData).unwrap()
      if (result?.id) {
        toast.success('Board created successfully!')
        // Use window.location as a fallback if router.push hangs in some environments
        router.push(`/board/${result.id}`)
      } else {
        throw new Error('No board ID returned')
      }
    } catch (error) {
      console.error('Board creation failed:', error)
      const err = error as any
      toast.error(err?.data?.error || err?.message || 'Failed to create board')
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create New Board</CardTitle>
          <CardDescription>
            Set up a new workspace for your team. You can invite members later.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Board Name</Label>
              <Input
                id="name"
                placeholder="e.g. Engineering Project"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this board for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Theme Color</Label>
              <div className="flex gap-4 items-center">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={isLoading}
                  className="w-16 h-12 p-1 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">
                  Used for the board avatar and highlights
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
              className="rounded-[9999px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="rounded-[9999px] min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Board'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
