"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Clock, TrendingUp } from "lucide-react"

const enter = (delay: number) => ({
  duration: 0.6,
  delay,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
})

export function FloatingHero() {
  return (
    <div className="relative w-full mt-10 sm:mt-14">
      <div className="relative mx-auto max-w-4xl h-[360px] sm:h-[420px]">
        {/* Left back card: Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -8 }}
          animate={{ opacity: 1, y: 0, rotate: -6 }}
          transition={enter(0.4)}
          className="absolute left-0 sm:left-8 top-10 sm:top-14 w-[230px] sm:w-[270px] z-10 hidden sm:block"
        >
          <AnalyticsCard />
        </motion.div>

        {/* Right back card: Velocity */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 8 }}
          animate={{ opacity: 1, y: 0, rotate: 5 }}
          transition={enter(0.55)}
          className="absolute right-0 sm:right-8 top-6 sm:top-10 w-[220px] sm:w-[260px] z-10 hidden sm:block"
        >
          <VelocityCard />
        </motion.div>

        {/* Center main card: Kanban */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={enter(0.3)}
          className="absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-[440px] sm:max-w-[500px] z-20"
        >
          <KanbanCard />
        </motion.div>

        {/* Floating notification toast */}
        <motion.div
          initial={{ opacity: 0, y: 20, x: -10 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={enter(0.7)}
          className="absolute left-2 sm:left-20 bottom-0 z-30"
        >
          <NotificationToast />
        </motion.div>

        {/* Floating stat badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, x: 10 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={enter(0.8)}
          className="absolute right-2 sm:right-16 bottom-4 z-30"
        >
          <StatBadge />
        </motion.div>
      </div>
    </div>
  )
}

function KanbanCard() {
  return (
    <div className="rounded-xl border border-hairline bg-canvas shadow-xl shadow-black/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 px-4 h-9 border-b border-hairline bg-canvas-soft">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-hairline-strong" />
          <div className="size-2.5 rounded-full bg-hairline-strong" />
          <div className="size-2.5 rounded-full bg-hairline-strong" />
        </div>
        <span className="text-[10px] text-body-text ml-2 font-medium">
          Sprint 24 &mdash; Board
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          { title: "To Do", count: 3, tasks: [{ name: "API rate limiting", tag: "Backend", done: false }, { name: "Onboarding flow", tag: "Design", done: false }] },
          { title: "In Progress", count: 2, tasks: [{ name: "Real-time sync", tag: "Core", done: false }, { name: "Auth refactor", tag: "Security", done: false }] },
          { title: "Done", count: 4, tasks: [{ name: "DB migration", tag: "Backend", done: true }, { name: "CI pipeline", tag: "DevOps", done: true }] },
        ].map((col) => (
          <div key={col.title} className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-ink uppercase tracking-wider">{col.title}</span>
              <span className="text-[9px] text-body-text bg-canvas-soft px-1.5 py-0.5 rounded">{col.count}</span>
            </div>
            {col.tasks.map((t) => (
              <div key={t.name} className="rounded-md border border-hairline bg-canvas px-2.5 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className={`size-3 ${t.done ? "text-success" : "text-hairline-strong"}`} />
                  <span className="text-[10px] font-medium text-ink leading-tight">{t.name}</span>
                </div>
                <div className="ml-4">
                  <span className="text-[8px] text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium">{t.tag}</span>
                </div>
              </div>
            ))}
            <div className="rounded-md border border-dashed border-hairline py-1.5 text-center">
              <span className="text-[9px] text-body-text">+ Add</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyticsCard() {
  return (
    <div className="rounded-xl border border-hairline bg-canvas shadow-lg shadow-black/[0.05] overflow-hidden">
      <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ink">Team Overview</span>
        <TrendingUp className="size-3.5 text-success" />
      </div>
      <div className="p-4 space-y-3">
        {[
          { label: "Tasks Done", value: "142", pct: 82 },
          { label: "Velocity", value: "34 pts", pct: 65 },
          { label: "Avg Cycle", value: "3.2d", pct: 45 },
        ].map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-body-text">{s.label}</span>
              <span className="text-[9px] font-bold text-ink">{s.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-canvas-soft overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.pct}%` }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="h-full rounded-full bg-accent"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VelocityCard() {
  const bars = [45, 30, 65, 50, 80, 60, 90]
  return (
    <div className="rounded-xl border border-hairline bg-canvas shadow-lg shadow-black/[0.05] overflow-hidden">
      <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ink">Sprint Velocity</span>
        <span className="text-[9px] text-success font-medium">+12%</span>
      </div>
      <div className="p-4">
        <div className="flex items-end gap-1.5 h-[80px]">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.5, delay: 0.6 + i * 0.05 }}
              className={`flex-1 rounded-t-sm ${h > 70 ? "bg-accent" : "bg-hairline"}`}
            />
          ))}
        </div>
        <div className="flex gap-1.5 mt-2">
          {["S1", "S2", "S3", "S4", "S5", "S6", "S7"].map((d) => (
            <span key={d} className="flex-1 text-center text-[7px] text-body-text font-medium">{d}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotificationToast() {
  return (
    <div className="rounded-lg border border-hairline bg-canvas shadow-xl shadow-black/[0.1] px-3 py-2.5 flex items-center gap-2.5 max-w-[200px]">
      <div className="size-8 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
        <CheckCircle2 className="size-4 text-accent" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-ink">Task approved</span>
        <span className="text-[9px] text-body-text">Sarah approved &ldquo;Sync engine&rdquo;</span>
      </div>
    </div>
  )
}

function StatBadge() {
  return (
    <div className="rounded-lg border border-hairline bg-canvas shadow-xl shadow-black/[0.1] px-3 py-2 flex items-center gap-2">
      <Clock className="size-4 text-success" />
      <div className="flex flex-col">
        <span className="text-[14px] font-bold text-ink leading-none">50ms</span>
        <span className="text-[8px] text-body-text mt-0.5">avg latency</span>
      </div>
    </div>
  )
}
