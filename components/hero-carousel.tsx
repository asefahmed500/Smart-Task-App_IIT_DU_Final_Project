"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const slides = [
  {
    id: "kanban",
    label: "Kanban Board",
    desc: "Manage tasks across columns with real-time drag-and-drop.",
  },
  {
    id: "sprint",
    label: "Sprint Planning",
    desc: "Plan sprints, track velocity, and auto-migrate tasks.",
  },
  {
    id: "analytics",
    label: "Analytics",
    desc: "Live charts and metrics for team performance.",
  },
]

export function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length)
  }, [])

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(next, 4500)
    return () => clearInterval(timer)
  }, [isPaused, next])

  const slide = slides[current]

  return (
    <div
      className="relative w-full h-full min-h-[360px] sm:min-h-[420px] rounded-xl border border-[#E5E7EB] bg-white overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides container */}
      <div className="relative size-full">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-all duration-500 ease-in-out ${
              i === current
                ? "opacity-100 scale-100"
                : "opacity-0 scale-[0.97] pointer-events-none"
            }`}
          >
            {s.id === "kanban" && <KanbanMockup />}
            {s.id === "sprint" && <SprintMockup />}
            {s.id === "analytics" && <AnalyticsMockup />}
          </div>
        ))}
      </div>

      {/* Bottom bar: label + dots */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-white/80 to-transparent">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[#1A1A1A]">{slide.label}</span>
          <span className="text-[10px] text-[#555555]">{slide.desc}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="size-7 flex items-center justify-center rounded-md border border-[#E5E7EB] text-[#555555] hover:text-[#1A1A1A] hover:bg-[#F8F9FA] transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <div className="flex items-center gap-1.5 px-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-5 h-1.5 bg-[#1A1A1A]"
                    : "w-1.5 h-1.5 bg-[#E5E7EB] hover:bg-[#ccc]"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="size-7 flex items-center justify-center rounded-md border border-[#E5E7EB] text-[#555555] hover:text-[#1A1A1A] hover:bg-[#F8F9FA] transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Mockup: Kanban Board ── */
function KanbanMockup() {
  const columns = [
    { title: "To Do", tasks: ["API design", "Auth flow"], color: "bg-[#F8F9FA]" },
    { title: "In Progress", tasks: ["Dashboard refactor"], color: "bg-[#EFF6FF]" },
    { title: "Done", tasks: ["Project setup", "DB schema"], color: "bg-[#F0FDF4]" },
  ]

  return (
    <div className="size-full p-6 flex flex-col gap-4 bg-[#F8F9FA]">
      {/* Board header */}
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-[#3B82F6]" />
        <span className="text-xs font-semibold text-[#1A1A1A]">Sprint 24</span>
        <span className="text-[10px] text-[#555555] ml-auto">7 tasks</span>
      </div>
      {/* Columns */}
      <div className="flex gap-3 flex-1">
        {columns.map((col) => (
          <div key={col.title} className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-semibold text-[#555555] uppercase tracking-wider">{col.title}</span>
              <span className="text-[9px] text-[#555555]">({col.tasks.length})</span>
            </div>
            {col.tasks.map((t) => (
              <div
                key={t}
                className={`${col.color} rounded-md border border-[#E5E7EB] px-2.5 py-2`}
              >
                <span className="text-[10px] font-medium text-[#1A1A1A]">{t}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Mockup: Sprint Planning ── */
function SprintMockup() {
  return (
    <div className="size-full p-6 flex flex-col gap-4 bg-[#F8F9FA]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-[#3B82F6]" />
        <span className="text-xs font-semibold text-[#1A1A1A]">Sprint Velocity</span>
        <span className="text-[10px] text-[#555555] ml-auto">Days 1–14</span>
      </div>
      {/* Velocity chart */}
      <div className="flex-1 flex flex-col justify-end gap-1">
        <div className="flex items-end gap-2 h-[120px]">
          {[65, 45, 80, 55, 90].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] text-[#555555]">{v}</span>
              <div
                className="w-full rounded-t-sm bg-[#3B82F6]/20"
                style={{ height: `${v}%` }}
              >
                <div
                  className="w-full bg-[#3B82F6] rounded-t-sm transition-all"
                  style={{ height: `${v * 0.7}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
            <span key={d} className="flex-1 text-center text-[8px] text-[#555555]">{d}</span>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-4 text-[9px] text-[#555555]">
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-sm bg-[#3B82F6]" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-sm bg-[#3B82F6]/20" />
          <span>Planned</span>
        </div>
      </div>
    </div>
  )
}

/* ── Mockup: Analytics ── */
function AnalyticsMockup() {
  return (
    <div className="size-full p-6 flex flex-col gap-4 bg-[#F8F9FA]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-[#3B82F6]" />
        <span className="text-xs font-semibold text-[#1A1A1A]">Team Overview</span>
        <span className="text-[10px] text-[#555555] ml-auto">This month</span>
      </div>
      {/* Stat cards */}
      <div className="flex gap-2">
        {[
          { label: "Tasks Done", value: "142", change: "+12%" },
          { label: "Avg Cycle", value: "3.2d", change: "-8%" },
          { label: "Velocity", value: "34", change: "+5%" },
        ].map((stat) => (
          <div key={stat.label} className="flex-1 bg-white rounded-md border border-[#E5E7EB] p-2.5">
            <span className="text-[8px] text-[#555555]">{stat.label}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-bold text-[#1A1A1A]">{stat.value}</span>
              <span className="text-[8px] text-[#22C55E]">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Mini activity dots */}
      <div className="flex-1 bg-white rounded-md border border-[#E5E7EB] p-3 flex flex-col gap-2">
        <span className="text-[9px] font-semibold text-[#555555]">Activity</span>
        <div className="flex items-end gap-1 flex-1">
          {[3, 7, 4, 9, 5, 8, 6, 10, 4, 7, 9, 5, 8, 6].map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${v * 10}%`,
                backgroundColor: v > 7 ? "#3B82F6" : v > 5 ? "#93C5FD" : "#E5E7EB",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
