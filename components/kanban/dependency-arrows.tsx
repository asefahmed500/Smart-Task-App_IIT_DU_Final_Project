'use client'

import { useEffect, useState, useRef } from 'react'
import { Task } from '@/lib/slices/boardsApi'

interface DependencyArrowsProps {
  tasks: Task[]
  containerRef: React.RefObject<HTMLDivElement>
}

interface RectPosition {
  x: number
  y: number
  width: number
  height: number
}

interface ArrowPosition {
  from: RectPosition
  to: RectPosition
}

export default function DependencyArrows({ tasks, containerRef }: DependencyArrowsProps) {
  const [arrows, setArrows] = useState<ArrowPosition[]>([])
  const [positions, setPositions] = useState<Map<string, RectPosition>>(new Map())

  // Update positions when tasks or container change
  useEffect(() => {
    if (!containerRef.current) return

    const updatePositions = () => {
      const newPositions = new Map<string, RectPosition>()
      const newArrows: ArrowPosition[] = []

      // Get positions of all task cards
      tasks.forEach((task) => {
        const el = containerRef.current?.querySelector(`[data-task-id="${task.id}"]`)
        if (el) {
          const rect = el.getBoundingClientRect()
          const containerRect = containerRef.current!.getBoundingClientRect()
          newPositions.set(task.id, {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height,
          })
        }
      })

      setPositions(newPositions)

      // Create arrows for blockers
      tasks.forEach((task) => {
        const blockers = task.blockers || []
        blockers.forEach((blocker: any) => {
          const fromPos = newPositions.get(blocker.blocker?.id)
          const toPos = newPositions.get(task.id)
          if (fromPos && toPos) {
            newArrows.push({
              from: { x: fromPos.x, y: fromPos.y, width: fromPos.width, height: fromPos.height },
              to: { x: toPos.x, y: toPos.y, width: toPos.width, height: toPos.height },
            })
          }
        })
      })

      setArrows(newArrows)
    }

    updatePositions()

    // Recalculate on scroll and resize
    const container = containerRef.current
    container?.addEventListener('scroll', updatePositions)
    window.addEventListener('resize', updatePositions)

    return () => {
      container?.removeEventListener('scroll', updatePositions)
      window.removeEventListener('resize', updatePositions)
    }
  }, [tasks, containerRef])

  const getPath = (arrow: ArrowPosition) => {
    const from = arrow.from
    const to = arrow.to

    // Start from right middle of source card
    const startX = from.x + from.width
    const startY = from.y + from.height / 2

    // End at left middle of target card
    const endX = to.x
    const endY = to.y + to.height / 2

    // Create curved path
    const midX = (startX + endX) / 2
    const controlOffset = Math.abs(endY - startY) * 0.5

    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
  }

  if (arrows.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <marker
          id="arrowhead-red"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
        </marker>
        <marker
          id="arrowhead-green"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
        </marker>
      </defs>
      {arrows.map((arrow, index) => (
        <g key={index}>
          <path
            d={getPath(arrow)}
            stroke="#ef4444"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead-red)"
            opacity="0.6"
          />
        </g>
      ))}
    </svg>
  )
}
