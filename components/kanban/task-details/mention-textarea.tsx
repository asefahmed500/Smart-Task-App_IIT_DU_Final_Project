'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from '@/types/kanban'
import { cn } from '@/utils/utils'

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  members: User[]
  className?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  members,
  className,
  onKeyDown
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredMembers = members.filter(member => 
    member.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleInput = () => {
      const position = textarea.selectionStart
      setCursorPos(position)
      
      const textBeforeCursor = textarea.value.slice(0, position)
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@')
      
      if (lastAtSymbol !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1)
        // Check if there are spaces between @ and cursor
        if (!textAfterAt.includes(' ')) {
          setSearchQuery(textAfterAt)
          setShowSuggestions(true)
          setSelectedIndex(0)
          return
        }
      }
      
      setShowSuggestions(false)
    }

    textarea.addEventListener('input', handleInput)
    textarea.addEventListener('click', handleInput)
    textarea.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') handleInput()
    })

    return () => {
      textarea.removeEventListener('input', handleInput)
      textarea.removeEventListener('click', handleInput)
    }
  }, [])

  const handleSelectMember = (member: User) => {
    if (!textareaRef.current) return

    const textBeforeAt = value.slice(0, value.lastIndexOf('@', cursorPos - 1))
    const textAfterCursor = value.slice(cursorPos)
    
    // Insert name with a space after
    const newValue = `${textBeforeAt}@${member.name} ${textAfterCursor}`
    onChange(newValue)
    setShowSuggestions(false)
    
    // Focus back and set cursor
    setTimeout(() => {
      textareaRef.current?.focus()
      const newPos = textBeforeAt.length + (member.name?.length || 0) + 2
      textareaRef.current?.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredMembers.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        handleSelectMember(filteredMembers[selectedIndex])
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    } else if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter to submit
      e.preventDefault()
      const form = textareaRef.current?.form
      if (form) {
        form.requestSubmit()
      }
    }
    
    if (onKeyDown) onKeyDown(e)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <Popover open={showSuggestions && filteredMembers.length > 0} onOpenChange={setShowSuggestions}>
        <PopoverAnchor asChild>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder={placeholder}
            className={className}
          />
        </PopoverAnchor>
        <PopoverContent 
          className="p-1 w-64 bg-background/95 backdrop-blur-xl border-primary/10 shadow-xl rounded-xl" 
          align="start"
          side="top"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollArea className="max-h-[200px]">
            <div className="flex flex-col gap-0.5">
              {filteredMembers.map((member, index) => (
                <button
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex items-center gap-2 w-full p-2 text-left rounded-lg transition-all text-sm",
                    index === selectedIndex ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                  )}
                >
                  <Avatar className="size-6 border border-primary/5">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback className="text-[8px]">{member.name?.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 truncate">
                    <span className="font-medium truncate">{member.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{member.role}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
