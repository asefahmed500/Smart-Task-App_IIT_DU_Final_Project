'use client'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"

interface PresenceUser {
  id: string
  name: string
  image: string | null
}

interface PresenceAvatarsProps {
  users: PresenceUser[]
}

export function PresenceAvatars({ users }: PresenceAvatarsProps) {
  return (
    <div className="flex items-center -space-x-2 overflow-hidden">
      <TooltipProvider>
        <AnimatePresence>
          {users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="border-2 border-background ring-2 ring-primary/5 size-8 hover:scale-110 transition-transform cursor-default">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold uppercase">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px] uppercase tracking-wider font-bold">
                  {user.name} (Viewing)
                </TooltipContent>
              </Tooltip>
            </motion.div>
          ))}
        </AnimatePresence>
      </TooltipProvider>
      {users.length > 5 && (
        <div className="size-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground ml-2">
          +{users.length - 5}
        </div>
      )}
    </div>
  )
}
