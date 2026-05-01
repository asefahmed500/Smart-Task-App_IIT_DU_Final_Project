'use client'

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <Button 
      variant="ghost" 
      className="w-full justify-start gap-3 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      onClick={handleLogout}
    >
      <LogOut className="size-4" />
      <span>Logout</span>
    </Button>
  )
}
