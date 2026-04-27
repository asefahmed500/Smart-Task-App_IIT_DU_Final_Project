import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // ElevenLabs input styling
        "h-8 w-full min-w-0 rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-body-standard text-black transition-colors",
        // Inset border shadow for subtle edge definition
        "shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset]",
        "placeholder:text-muted-foreground",
        // Focus states
        "focus-visible:border-[rgba(0,0,0,0.15)] focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-0",
        // Disabled states
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:opacity-50",
        // Error states
        "aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
        // File input styles
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-black",
        className
      )}
      {...props}
    />
  )
}

export { Input }
