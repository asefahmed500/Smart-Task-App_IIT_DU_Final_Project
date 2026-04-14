'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { undo, redo } from '@/lib/slices/undoSlice'
import { toast } from 'sonner'
import { Undo, Redo } from 'lucide-react'

export function UndoKeyboardHandler() {
  const dispatch = useAppDispatch()
  const past = useAppSelector((s) => s.undo.past)
  const future = useAppSelector((s) => s.undo.future)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifierKey = isMac ? e.metaKey : e.ctrlKey

      // Ignore if in input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Ctrl+Z or Cmd+Z - Undo
      if (modifierKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (past.length > 0) {
          dispatch(undo())
          toast.success('Undo successful', {
            icon: <Undo className="h-4 w-4" />,
            action: {
              label: 'Redo',
              onClick: () => dispatch(redo()),
            },
          })
        } else {
          toast.info('Nothing to undo')
        }
      }

      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z - Redo
      if (modifierKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (future.length > 0) {
          dispatch(redo())
          toast.success('Redo successful', {
            icon: <Redo className="h-4 w-4" />,
            action: {
              label: 'Undo',
              onClick: () => dispatch(undo()),
            },
          })
        } else {
          toast.info('Nothing to redo')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, past.length, future.length])

  return null
}
