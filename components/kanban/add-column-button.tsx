'use client'

import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateColumnMutation } from '@/lib/slices/boardsApi'
import { useGetSessionQuery } from '@/lib/use-session'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface AddColumnButtonProps {
  boardId: string
}

export default function AddColumnButton({ boardId }: AddColumnButtonProps) {
  const { data: session } = useGetSessionQuery()
  const canManage = session?.role === 'ADMIN' || session?.role === 'MANAGER'

  if (!canManage) return null
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [createColumn, { isLoading }] = useCreateColumnMutation()

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await createColumn({ boardId, name: name.trim() }).unwrap()
      toast.success('Column created')
      setName('')
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to create column')
    }
  }

  return (
    <div className="w-80 flex-shrink-0">
      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.button
            key="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => setIsEditing(true)}
            className="w-full h-14 rounded-[20px] border-2 border-dashed border-black/10 hover:border-black/20 hover:bg-black/[0.02] flex items-center justify-center gap-2 text-black/40 hover:text-black/60 transition-all font-bold group"
          >
            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors">
              <Plus className="h-4 w-4" />
            </div>
            Add Column
          </motion.button>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-white/80 backdrop-blur-xl border border-black/5 rounded-[24px] p-4 shadow-xl"
          >
            <Input
              autoFocus
              placeholder="Column name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-3 rounded-xl border-black/10 focus-visible:ring-black/20 font-bold"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setIsEditing(false)
              }}
            />
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={handleCreate} 
                disabled={isLoading || !name.trim()}
                className="flex-1 rounded-xl font-bold bg-black hover:bg-black/80"
              >
                {isLoading ? 'Creating...' : 'Create Column'}
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setIsEditing(false)}
                className="h-9 w-9 rounded-xl text-black/40 hover:text-black/60 hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
