import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // ElevenLabs badge styling - more subtle
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[4px] border border-transparent px-2 py-0.5 text-small font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-black text-white [a]:hover:bg-black/80",
        secondary:
          "bg-[rgba(245,242,239,0.8)] text-black [a]:hover:bg-[rgba(245,242,239,1)]",
        destructive:
          "bg-red-500/10 text-red-600 [a]:hover:bg-red-500/20",
        outline:
          "border-[rgba(0,0,0,0.08)] text-black [a]:hover:bg-[#f5f5f5]",
        ghost:
          "hover:bg-[#f5f5f5] hover:text-black",
        link: "text-black underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
