"use client"

import { motion } from "framer-motion"

interface MotionDivProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function MotionDiv({ children, className, delay = 0 }: MotionDivProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
