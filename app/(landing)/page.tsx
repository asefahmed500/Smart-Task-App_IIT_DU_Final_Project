"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Users,
  Lock,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  MousePointer2,
  Calendar,
  Layers,
  Layout,
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
} from "lucide-react"
import { LandingRedirect } from "@/components/auth/landing-redirect"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { useRef, useState } from "react"

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200])

  // Dashboard Mockup State
  const [activeTab, setActiveTab] = useState(1)
  const [tasks, setTasks] = useState([
    { id: 1, title: "Fix authentication flow", assignee: "Alex M.", priority: "high", status: "backlog", color: "rose" },
    { id: 2, title: "Database schema migration", assignee: "Sarah K.", priority: "medium", status: "backlog", color: "amber" },
    { id: 3, title: "Update landing page design", assignee: "Mike R.", priority: "low", status: "backlog", color: "blue" },
    { id: 4, title: "Implement real-time presence", assignee: "Emma L.", priority: "high", status: "engineering", color: "rose", active: true, time: "3h" },
    { id: 5, title: "Socket.IO latency optimization", assignee: "John D.", priority: "medium", status: "engineering", color: "amber", time: "5h" },
    { id: 6, title: "API rate limiting", assignee: "Lisa P.", priority: "high", status: "done", color: "rose" },
    { id: 7, title: "User dashboard redesign", assignee: "Tom H.", priority: "low", status: "done", color: "blue" },
  ])

  const moveTask = (id: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === "backlog" ? "engineering" : t.status === "engineering" ? "done" : "backlog"
        return { ...t, status: nextStatus }
      }
      return t
    }))
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-background overflow-hidden">
      <LandingRedirect />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-black/[0.03] bg-white/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-black shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)]"
            >
              <Zap className="h-6 w-6 text-white fill-white" />
            </motion.div>
            <span className="text-2xl font-bold tracking-tight text-black">
              SmartTask
            </span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-black/50 transition-colors hover:text-black"
            >
              Features
            </Link>
            <Link
              href="#comparison"
              className="text-sm font-medium text-black/50 transition-colors hover:text-black"
            >
              Solutions
            </Link>
            <div className="h-4 w-px bg-black/10" />
            <Link
              href="/login"
              className="text-sm font-medium text-black/60 transition-colors hover:text-black"
            >
              Sign In
            </Link>
            <Link href="/register">
              <Button
                variant="cta"
                className="rounded-full px-8 h-11 text-sm shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                Get Started
              </Button>
            </Link>
          </div>
          {/* Mobile Get Started (Always visible) */}
          <div className="md:hidden">
            <Link href="/register">
              <Button variant="cta" size="sm" className="rounded-full px-5 font-bold h-9">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="container relative z-10 mx-auto max-w-5xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-display-hero mb-6 text-5xl md:text-7xl lg:text-8xl tracking-tight"
          >
            Work that <span className="font-light italic text-muted-foreground">flows</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            A powerful task management system with real-time collaboration,
            WIP limits, and workflow automation for modern teams.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/register">
              <Button
                variant="black"
                size="lg"
                className="group h-12 rounded-full px-8 text-base font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-full px-8 text-base font-medium transition-all hover:bg-muted active:scale-95"
              >
                Sign In
              </Button>
            </Link>
          </motion.div>

          {/* Interactive White Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{ y: y1 }}
            className="relative mt-24 mx-auto max-w-6xl px-4"
          >
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-background shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_50px_100px_-25px_rgba(0,0,0,0.12)]">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md bg-background px-3 py-1 text-[9px] font-medium tracking-wide text-muted-foreground border border-border">
                    <Lock className="h-2.5 w-2.5" /> smarttask.io/engineering
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1.5">
                    <div className="h-6 w-6 rounded-full bg-blue-500 border-2 border-background" />
                    <div className="h-6 w-6 rounded-full bg-purple-500 border-2 border-background" />
                    <div className="h-6 w-6 rounded-full bg-amber-500 border-2 border-background" />
                  </div>
                  <button className="rounded-md bg-primary px-3 py-1 text-[9px] font-semibold text-primary-foreground">
                    Share
                  </button>
                </div>
              </div>

              <div className="flex h-[500px]">
                {/* Sidebar */}
                <div className="hidden w-14 border-r border-border bg-muted/10 p-2 lg:flex flex-col gap-2">
                  <button className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Layout className="h-4 w-4" />
                  </button>
                  <button className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted/30 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </button>
                  <button className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted/30 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4" />
                  </button>
                  <button className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted/30 flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </button>
                  <div className="flex-1" />
                  <button className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted/30 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col bg-background/50">
                  {/* Board Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Engineering Sprint</h3>
                      <p className="text-xs text-muted-foreground">Week 14 · Q1 2026</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Search tasks...</span>
                      </div>
                      <button className="rounded-md border border-border bg-background p-2">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Kanban Board */}
                  <div className="flex-1 p-4 overflow-x-auto">
                    <div className="flex h-full gap-4">
                      {/* Column: Backlog */}
                      <div className="flex-shrink-0 w-72 flex flex-col rounded-xl bg-muted/20 border border-border">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Backlog</span>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {tasks.filter(t => t.status === 'backlog').length}
                          </span>
                        </div>
                        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                          <AnimatePresence mode="popLayout">
                            {tasks.filter(t => t.status === 'backlog').map((task) => (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={task.id}
                                onClick={() => moveTask(task.id)}
                                whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                                className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <span className={`text-[8px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 ${
                                    task.priority === 'high' ? 'bg-rose-500/10 text-rose-600' :
                                    task.priority === 'medium' ? 'bg-amber-500/10 text-amber-600' :
                                    'bg-blue-500/10 text-blue-600'
                                  }`}>
                                    {task.priority}
                                  </span>
                                  <button className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5">
                                    <MoreVertical className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                </div>
                                <p className="text-xs font-medium text-foreground leading-snug mb-2">{task.title}</p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-[7px] font-semibold text-white flex items-center justify-center">
                                      {task.assignee.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="text-[9px] text-muted-foreground">{task.assignee}</span>
                                  </div>
                                  <MessageSquare className="h-3 w-3 text-muted-foreground/40" />
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Column: In Progress */}
                      <div className="flex-shrink-0 w-72 flex flex-col rounded-xl bg-muted/30 border border-border/60">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">In Progress</span>
                          </div>
                          <span className="text-[10px] font-semibold text-foreground bg-primary/10 px-1.5 py-0.5 rounded">
                            {tasks.filter(t => t.status === 'engineering').length} / 4
                          </span>
                        </div>
                        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                          <AnimatePresence mode="popLayout">
                            {tasks.filter(t => t.status === 'engineering').map((task) => (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={task.id}
                                onClick={() => moveTask(task.id)}
                                whileHover={{ scale: 1.02 }}
                                className="cursor-pointer relative rounded-lg border border-border/60 bg-card p-3 shadow-md"
                              >
                                {task.active && (
                                  <motion.div
                                    animate={{ x: [0, 4, 0], y: [0, -3, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute -top-1 -right-1 z-10 flex items-center gap-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[7px] font-semibold text-white shadow-md"
                                  >
                                    <MousePointer2 className="h-2 w-2 fill-white" /> Emma
                                  </motion.div>
                                )}
                                <div className="flex items-start justify-between mb-2">
                                  <span className={`text-[8px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 ${
                                    task.priority === 'high' ? 'bg-rose-500/10 text-rose-600' :
                                    task.priority === 'medium' ? 'bg-amber-500/10 text-amber-600' :
                                    'bg-blue-500/10 text-blue-600'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-foreground leading-snug mb-2">{task.title}</p>
                                <div className="h-0.5 w-full bg-muted/50 rounded-full mb-2">
                                  <div className="h-full w-3/4 bg-primary/60 rounded-full" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <div className="h-5 w-5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-[7px] font-semibold text-white flex items-center justify-center">
                                      {task.assignee.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="text-[9px] text-muted-foreground">{task.assignee}</span>
                                  </div>
                                  <div className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-600">
                                    <Clock className="h-2.5 w-2.5" /> {task.time}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Column: Done */}
                      <div className="flex-shrink-0 w-72 flex flex-col rounded-xl bg-muted/10 border border-border/50">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Done</span>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                            {tasks.filter(t => t.status === 'done').length}
                          </span>
                        </div>
                        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                          <AnimatePresence mode="popLayout">
                            {tasks.filter(t => t.status === 'done').map((task) => (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={task.id}
                                onClick={() => moveTask(task.id)}
                                whileHover={{ y: -1 }}
                                className="cursor-pointer rounded-lg border border-border/40 bg-muted/20 p-3 opacity-70 hover:opacity-100 transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-medium text-muted-foreground line-through">{task.title}</p>
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500/50 flex-shrink-0 ml-2" />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="h-4 w-4 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-[6px] font-semibold text-white flex items-center justify-center">
                                    {task.assignee.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <span className="text-[8px] text-muted-foreground">Completed</span>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle decorative elements */}
            <div className="absolute -left-16 -top-16 h-[150px] w-[150px] rounded-full bg-primary/3 blur-[60px]" />
            <div className="absolute -right-16 -bottom-16 h-[150px] w-[150px] rounded-full bg-amber-500/3 blur-[60px]" />
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 border-y border-border bg-muted/20">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-8">Trusted by modern teams</p>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16 opacity-40">
             {['Acme Corp', 'Global Dynamics', 'Hyperion', 'Cyberdyne', 'Stark Ind'].map(company => (
               <span key={company} className="text-base font-medium tracking-wide text-foreground">{company}</span>
             ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-section-heading mb-4 text-4xl md:text-5xl tracking-tight"
            >
              Built for productive teams
            </motion.h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to manage tasks efficiently, nothing you don't.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Lock className="h-5 w-5" />}
              title="WIP Limits"
              description="Hard constraints that prevent overloading your team."
            />
            <FeatureCard
              icon={<MousePointer2 className="h-5 w-5" />}
              title="Real-time Sync"
              description="See live updates and collaborate without conflicts."
            />
            <FeatureCard
              icon={<Clock className="h-5 w-5" />}
              title="Time Tracking"
              description="Built-in timers and manual time logging per task."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Analytics"
              description="Cycle time, lead time, and throughput metrics."
            />
            <FeatureCard
              icon={<Layers className="h-5 w-5" />}
              title="Multiple Views"
              description="Kanban, swimlane, calendar, and metrics views."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Automations"
              description="Trigger-based rules to auto-assign and notify."
            />
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="comparison" className="bg-muted/20 py-16 md:py-24">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-5xl rounded-3xl bg-card p-8 md:p-12 shadow-sm border border-border">
            <h3 className="text-card-heading mb-12 text-center text-3xl md:text-4xl tracking-tight">Why choose SmartTask?</h3>
            <div className="grid gap-12 md:grid-cols-3">
              <div className="space-y-6">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Other Tools</span>
                <ul className="space-y-4">
                  {['No WIP limits', 'Manual refresh', 'Complex setup', 'Expensive'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-6">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SmartTask</span>
                <ul className="space-y-4">
                  {['Hard WIP limits', 'Real-time sync', 'Simple setup', 'Free for small teams'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-6">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Results</span>
                <ul className="space-y-4">
                  {['Faster delivery', 'Less context switching', 'Better focus', 'Happier team'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="h-1 w-1 rounded-full bg-primary/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl"
          >
            <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-6 text-foreground">
              Ready to get <span className="font-semibold italic">started</span>?
            </h2>
            <p className="mb-10 text-lg text-muted-foreground max-w-xl mx-auto">
              Join thousands of teams already using SmartTask to manage their work more efficiently.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  variant="black"
                  size="lg"
                  className="h-12 rounded-full px-8 text-base font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                >
                  Create Free Account
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full px-8 text-base font-medium transition-all hover:bg-muted active:scale-95"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 bg-muted/20">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Zap className="h-4 w-4 text-foreground" />
            <span className="font-semibold text-foreground">SmartTask</span>
          </div>
          <div className="flex justify-center gap-6 mb-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Security</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Status</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 SmartTask. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  )
}
