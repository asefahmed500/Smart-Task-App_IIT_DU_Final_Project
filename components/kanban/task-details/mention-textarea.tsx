'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
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
  const [mentionStart, setMentionStart] = useState(-1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5)

  const detectMention = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    if (lastAtIndex === -1) {
      setShowSuggestions(false)
      return
    }
    const textBetweenAtAndCursor = textBeforeCursor.slice(lastAtIndex + 1)
    if (textBetweenAtAndCursor.includes('\n')) {
      setShowSuggestions(false)
      return
    }
    const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
    if (charBeforeAt !== ' ' && charBeforeAt !== '\n' && lastAtIndex !== 0) {
      setShowSuggestions(false)
      return
    }
    setShowSuggestions(true)
    setMentionStart(lastAtIndex)
    setSearchQuery(textBetweenAtAndCursor)
    setSelectedIndex(0)
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart
    onChange(newValue)
    detectMention(newValue, cursorPos)
  }, [onChange, detectMention])

  const handleSelectMember = useCallback((member: User) => {
    if (mentionStart === -1) return
    const beforeMention = value.slice(0, mentionStart)
    const afterQuery = value.slice(mentionStart + 1 + searchQuery.length)
    const newValue = `${beforeMention}@${member.name || member.email} ${afterQuery}`
    onChange(newValue)
    setShowSuggestions(false)
    setMentionStart(-1)
    setSearchQuery('')

    const nameLength = (member.name || member.email).length
    const newCursorPos = mentionStart + nameLength + 2
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    })
  }, [value, mentionStart, searchQuery, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showSuggestions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredMembers.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        handleSelectMember(filteredMembers[selectedIndex])
        return
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false)
        return
      }
    }
    if (onKeyDown) onKeyDown(e)
  }, [showSuggestions, filteredMembers, selectedIndex, handleSelectMember, onKeyDown])

  const handleClick = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    detectMention(value, textarea.selectionStart)
  }, [value, detectMention])

  return (
    <div className="relative w-full">
      <Popover open={showSuggestions && filteredMembers.length > 0} onOpenChange={setShowSuggestions}>
        <PopoverAnchor asChild>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
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
                    <AvatarFallback className="text-[8px]">{member.name?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
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