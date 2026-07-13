"use client"

import { useState } from "react"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { LogoIcon } from "@/components/logo-icon"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "AI", href: "#ai-features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Demo", href: "#demo" },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden ml-auto">
        <button
          className="flex size-9 items-center justify-center rounded-lg border border-hairline text-body-text hover:text-ink hover:bg-canvas-soft transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="size-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 border-l border-hairline bg-canvas">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SheetDescription className="sr-only">Mobile navigation links for SmartTask</SheetDescription>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-5 h-16 border-b border-hairline">
            <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <LogoIcon size={26} />
              <span className="text-sm font-semibold text-ink">SmartTask</span>
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="flex size-8 items-center justify-center rounded-md text-body-text hover:text-ink hover:bg-canvas-soft transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4">
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center px-3 py-2.5 rounded-md text-sm text-body-text hover:text-ink hover:bg-canvas-soft transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-hairline px-5 py-4 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-hairline px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas-soft transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-accent-strong transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
