"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Users,
  Lock,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Eye,
  MousePointer2,
  Calendar,
  Layers,
  Layout,
} from "lucide-react"
import { LandingRedirect } from "@/components/auth/landing-redirect"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200])
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -500])
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])

  return (
    <div ref={containerRef} className="min-h-screen bg-white mesh-gradient-warm">
      <LandingRedirect />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-black/5 bg-white/40 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-black shadow-lg"
            >
              <Zap className="h-6 w-6 text-white" />
            </motion.div>
            <span className="text-xl font-bold tracking-tight text-black">
              SmartTask
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-black/60 transition-colors hover:text-black"
            >
              Sign In
            </Link>
            <Link href="/register">
              <Button
                variant="black"
                className="rounded-full px-6 py-5 text-sm font-semibold shadow-xl hover:shadow-black/20"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-24 pb-32 md:pt-32 md:pb-48">
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-8 border-black/10 bg-white/50 px-5 py-1.5 text-xs font-medium backdrop-blur-sm"
            >
              🚀 The Future of Work Discipline
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-display-hero mb-8 text-6xl md:text-8xl"
          >
            Work in <span className="font-light italic">Sync</span>, Not in{' '}
            <span className="font-light underline decoration-black/10 underline-offset-8">
              Chaos
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-black/60"
          >
            A high-performance Kanban engine with hard WIP limits, real-time
            presence, and automated flow optimization.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/register">
              <Button
                variant="black"
                className="group h-14 rounded-full px-10 text-lg font-bold shadow-2xl transition-all hover:scale-105"
              >
                Start Engineering Flow
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                className="h-14 rounded-full border-black/10 bg-white/20 px-10 text-lg font-semibold backdrop-blur-sm transition-all hover:bg-white/40"
              >
                View Demo
              </Button>
            </Link>
          </motion.div>

          {/* Interactive Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{ y: y1 }}
            className="relative mt-24 mx-auto max-w-5xl"
          >
            <div className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white/50 p-2 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] backdrop-blur-2xl transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between border-b border-black/5 bg-white/80 px-6 py-4 backdrop-blur-md">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-black/5 px-4 py-1.5 text-[10px] font-medium tracking-wide text-black/40">
                  <Lock className="h-3 w-3" /> app.smarttask.io/board/67ed34
                </div>
                <div className="flex -space-x-2">
                  <div className="h-8 w-8 rounded-full border-2 border-white bg-blue-100 shadow-sm" />
                  <div className="h-8 w-8 rounded-full border-2 border-white bg-purple-100 shadow-sm" />
                  <div className="h-8 w-8 rounded-full border-2 border-white bg-amber-100 shadow-sm" />
                </div>
              </div>
              
              <div className="flex h-[600px] overflow-hidden">
                {/* Simulated Sidebar */}
                <div className="hidden w-20 border-r border-black/5 bg-white/40 p-4 lg:block">
                  <div className="flex flex-col gap-6 items-center">
                    <div className="h-10 w-10 rounded-xl bg-black/5" />
                    <div className="h-10 w-10 rounded-xl bg-black/10" />
                    <div className="h-10 w-10 rounded-xl bg-black/5" />
                  </div>
                </div>

                <div className="flex-1 p-8">
                  <div className="mb-8 flex items-center justify-between">
                    <div className="h-8 w-48 rounded-lg bg-black/5" />
                    <div className="h-8 w-32 rounded-lg bg-black/5" />
                  </div>

                  <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Column 1 */}
                    <div className="flex flex-col gap-4 rounded-2xl bg-black/5 p-4">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-bold uppercase tracking-wider text-black/60">Ready</span>
                        <Badge variant="secondary" className="bg-white/80">4</Badge>
                      </div>
                      <div className="h-32 rounded-xl border border-black/5 bg-white/80 p-4 shadow-sm" />
                      <div className="h-32 rounded-xl border border-black/5 bg-white/80 p-4 shadow-sm" />
                    </div>
                    {/* Column 2 */}
                    <div className="relative flex flex-col gap-4 rounded-2xl bg-black/[0.08] p-4 ring-2 ring-black/5">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-bold uppercase tracking-wider text-black">Active</span>
                        <Badge className="bg-black text-white">2 / 3</Badge>
                      </div>
                      <motion.div 
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="relative h-40 rounded-xl border border-black/10 bg-white p-5 shadow-xl"
                      >
                         <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 ring-1 ring-blue-100">
                           <MousePointer2 className="h-2 w-2" /> ALEX EDITING
                         </div>
                         <div className="mb-4 h-4 w-12 rounded-full bg-purple-100" />
                         <div className="h-3 w-full rounded bg-black/5" />
                         <div className="mt-2 h-3 w-2/3 rounded bg-black/5" />
                         <div className="mt-8 flex justify-between">
                           <div className="h-6 w-6 rounded-full bg-black/10" />
                           <div className="h-4 w-16 rounded bg-green-50 text-[10px] font-bold text-green-600 flex items-center justify-center">DUE 2D</div>
                         </div>
                      </motion.div>
                    </div>
                    {/* Column 3 */}
                    <div className="hidden md:flex flex-col gap-4 rounded-2xl bg-black/5 p-4 opacity-50">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-bold uppercase tracking-wider text-black/60">Done</span>
                        <Badge variant="secondary" className="bg-white/80">18</Badge>
                      </div>
                      <div className="h-32 rounded-xl border border-black/5 bg-white/40 p-4 shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-purple-200/30 blur-[100px]" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-200/30 blur-[100px]" />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="mb-24 text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-section-heading mb-6"
            >
              Precision Engineering for Teams
            </motion.h2>
            <p className="mx-auto max-w-2xl text-xl text-black/60">
              Stop fighting your tools. Start focused execution with components
              designed for the speed of modern engineering.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard 
              icon={<Lock className="h-6 w-6" />}
              title="WIP Enforcement"
              description="Hard constraints that prevent overloading your team. No new work until current work flows."
            />
            <FeatureCard 
              icon={<MousePointer2 className="h-6 w-6" />}
              title="Live Presence"
              description="Collaborate without collisions. See real-time cursors and editing states of every teammate."
            />
            <FeatureCard 
              icon={<Clock className="h-6 w-6" />}
              title="Predictive Timelines"
              description="Color-coded urgency indicators and automated staleness alerts keep work moving."
            />
            <FeatureCard 
              icon={<BarChart3 className="h-6 w-6" />}
              title="Flow Intelligence"
              description="Deep analytics on cycle times, lead times, and throughput to identify bottlenecks."
            />
            <FeatureCard 
              icon={<Layers className="h-6 w-6" />}
              title="Swimlane Power"
              description="Pivot your board instantly by priority, assignee, or custom labels without lost context."
            />
            <FeatureCard 
              icon={<Zap className="h-6 w-6" />}
              title="Automation Engine"
              description="Powerful trigger-based rules to auto-assign, notify, and move tasks across your workflow."
            />
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-black/5 py-32 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-4xl rounded-3xl bg-white p-12 shadow-2xl">
            <h3 className="text-card-heading mb-12 text-center">Why Engineering Teams Choose SmartTask</h3>
            <div className="grid gap-12 md:grid-cols-3">
              <div className="space-y-6">
                <span className="text-xs font-bold uppercase tracking-widest text-black/30">General Tools</span>
                <ul className="space-y-4">
                  {['No WIP limits', 'Manual refresh', 'Chaos on big boards', 'Soft warnings only'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-black/40">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-6">
                <span className="text-xs font-bold uppercase tracking-widest text-black/30">Legacy Enterprise</span>
                <ul className="space-y-4">
                  {['Complex setup', 'Sluggish UI', 'Over-engineered', 'Steep learning curve'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-black/40">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-6">
                <span className="text-xs font-bold uppercase tracking-widest text-black">SmartTask</span>
                <ul className="space-y-4">
                  {['Hard WIP discipline', 'Sub-100ms real-time', 'Lean execution focus', 'Zero-config speed'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-bold text-black">
                      <CheckCircle2 className="h-5 w-5 text-black" />
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
      <section className="py-48">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-3xl rounded-[40px] bg-black p-16 text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
          >
            <h2 className="text-5xl font-light leading-tight mb-8">
              Experience the <span className="italic font-normal">Flow State</span>
            </h2>
            <p className="mb-12 text-lg text-white/60">
              Join the elite engineering teams who have traded project management
              friction for high-velocity delivery.
            </p>
            <Link href="/register">
              <Button variant="white" className="h-16 rounded-full px-12 text-xl font-bold transition-transform hover:scale-105">
                Launch Your First Board
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-black" />
            <span className="font-bold">SmartTask</span>
          </div>
          <p className="text-sm text-black/40">
            © 2026 SmartTask Platform. High-Performance Workflow Engineering.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white/40 p-8 transition-all hover:bg-white hover:shadow-2xl"
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/5 text-black transition-colors group-hover:bg-black group-hover:text-white">
        {icon}
      </div>
      <h3 className="mb-4 text-2xl font-semibold tracking-tight text-black">{title}</h3>
      <p className="text-lg leading-relaxed text-black/50">{description}</p>
    </motion.div>
  )
}
