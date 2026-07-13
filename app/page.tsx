import Link from "next/link"
import { getSession } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DemoKanban } from "@/components/demo-kanban"
import { LogoIcon } from "@/components/logo-icon"
import { MobileNav } from "@/components/mobile-nav"
import { FloatingHero } from "@/components/floating-hero"
import {
  Grid3X3, Calendar, ShieldCheck, Workflow, WifiOff, BarChart3,
  Sparkles, GitBranch, Bell, LayoutTemplate, Check, ArrowRight,
} from "lucide-react"

export default async function LandingPage() {
  const session = await getSession()

  if (session) {
    if (session.role === "ADMIN") redirect("/admin")
    if (session.role === "MANAGER") redirect("/manager")
    if (session.role === "MEMBER") redirect("/member")
  }

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-ink selection:bg-accent-soft selection:text-accent">

      {/* Navbar */}
      <header className="px-4 sm:px-6 lg:px-10 h-16 flex items-center border-b border-hairline bg-canvas/80 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center gap-2 shrink-0" href="/">
          <LogoIcon size={30} />
          <span className="text-sm font-semibold text-ink tracking-tight">SmartTask</span>
        </Link>
        <nav className="hidden md:flex ml-10 gap-8">
          {[
            { label: "Features", href: "#features" },
            { label: "AI", href: "#ai-features" },
            { label: "Pricing", href: "#pricing" },
            { label: "Demo", href: "#demo" },
          ].map((l) => (
            <Link key={l.href} className="text-sm text-body-text hover:text-ink transition-colors" href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex ml-auto items-center gap-3">
          <Link href="/login" className="text-sm text-body-text hover:text-ink transition-colors px-3 py-1.5">
            Log in
          </Link>
          <Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-ink text-on-primary px-4 py-2 text-sm font-medium hover:bg-ink-primary-active transition-colors">
            Sign up
          </Link>
        </div>
        <MobileNav />
      </header>

      <main className="flex-1">

        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative w-full overflow-hidden">
          {/* Gradient mesh background */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-radial from-accent/[0.06] via-transparent to-transparent rounded-full blur-3xl" />
            <div className="absolute top-20 left-10 w-[400px] h-[300px] bg-accent/[0.04] rounded-full blur-3xl" />
            <div className="absolute top-32 right-10 w-[400px] h-[300px] bg-gradient-to-br from-accent/[0.04] to-transparent rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 pt-16 sm:pt-20 lg:pt-24 pb-10">
            {/* Centered text */}
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-hairline bg-canvas-soft mb-6">
                <span className="size-1.5 rounded-full bg-accent" />
                <span className="text-xs font-medium text-body-text tracking-wide">Intelligent Productivity</span>
              </div>
              <h1 className="display-xl text-ink mb-5">
                Manage tasks smarter,
                <br />
                ship faster.
              </h1>
              <p className="text-[15px] sm:text-[16px] text-body-text leading-relaxed max-w-[500px] mb-8">
                SmartTask helps teams organize, prioritize, and execute work with real-time collaboration, AI-powered automation, and analytics built in.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent text-on-primary px-6 py-3 text-sm font-medium hover:bg-accent-strong transition-colors shadow-sm">
                  Start Building for Free
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link href="#demo" className="inline-flex items-center justify-center rounded-lg border border-hairline text-ink px-6 py-3 text-sm font-medium hover:bg-canvas-soft transition-colors">
                  Watch Demo
                </Link>
              </div>
            </div>

            {/* Floating cards */}
            <FloatingHero />
          </div>

          {/* Social proof strip */}
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-12">
            <p className="text-center text-xs text-muted-text font-medium uppercase tracking-widest mb-6">
              Trusted by fast-moving teams
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
              {["Vercel", "Linear", "Supabase", "Notion", "Figma"].map((b) => (
                <span key={b} className="text-lg font-semibold text-ink tracking-tight">{b}</span>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="h-px bg-hairline" />
        </div>

        {/* ═══════════════ DEMO ═══════════════ */}
        <section id="demo" className="w-full px-4 sm:px-6 lg:px-10 py-20 lg:py-28">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mb-10 lg:mb-12">
              <h2 className="display-lg text-ink mb-3">See it in action.</h2>
              <p className="text-[15px] text-body-text leading-relaxed">
                Click any task to move it across columns. This is a live demo of your workflow.
              </p>
            </div>
            <div className="rounded-xl border border-hairline overflow-hidden bg-canvas shadow-lg shadow-black/[0.04]">
              <DemoKanban />
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10"><div className="h-px bg-hairline" /></div>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="features" className="w-full px-4 sm:px-6 lg:px-10 py-20 lg:py-28">
          <div className="max-w-5xl mx-auto">
            <div className="max-w-2xl mb-12 lg:mb-16">
              <h2 className="display-lg text-ink mb-3">
                Everything you need to ship.
              </h2>
              <p className="text-[15px] text-body-text leading-relaxed">
                Built for teams who care about speed, clarity, and getting things done.
              </p>
            </div>
            <div className="grid gap-px bg-hairline grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 rounded-xl overflow-hidden border border-hairline">
              {[
                { title: "Real-time Sync", desc: "Every change reflected instantly across all devices and team members.", metric: "<50ms", metricLabel: "latency" },
                { title: "Role-based Access", desc: "Granular control over who can see, edit, and manage every board.", metric: "4 levels", metricLabel: "permissions" },
                { title: "Smart Automation", desc: "Automate repetitive workflows with triggers, conditions, and actions.", metric: "1,200+", metricLabel: "automations daily" },
                { title: "Sprint Planning", desc: "Plan, track, and ship with sprint management and velocity tracking.", metric: "12.4x", metricLabel: "faster planning" },
                { title: "Offline Mode", desc: "Keep working with full functionality even without a connection.", metric: "100%", metricLabel: "offline capability" },
                { title: "Live Analytics", desc: "Understand team performance with metrics that update in real time.", metric: "30+", metricLabel: "data points/task" },
              ].map((f) => (
                <div key={f.title} className="bg-canvas p-6 lg:p-8 flex flex-col justify-between gap-4 hover:bg-canvas-soft transition-colors">
                  <div>
                    <div className="text-2xl lg:text-3xl font-bold text-accent tracking-tight mb-0.5">{f.metric}</div>
                    <div className="text-xs text-body-text mb-3 lg:mb-4">{f.metricLabel}</div>
                    <h3 className="text-sm lg:text-base font-semibold text-ink mb-1.5">{f.title}</h3>
                    <p className="text-[13px] lg:text-sm text-body-text leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10"><div className="h-px bg-hairline" /></div>

        {/* ═══════════════ BENTO GRID ═══════════════ */}
        <section className="w-full px-4 sm:px-6 lg:px-10 py-20 lg:py-28">
          <div className="max-w-5xl mx-auto">
            <div className="max-w-2xl mb-12 lg:mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-hairline bg-canvas-soft mb-4">
                <span className="text-xs font-medium text-body-text tracking-wide">Built for Teams</span>
              </div>
              <h2 className="display-lg text-ink mb-3">Everything built in. Nothing extra.</h2>
              <p className="text-[15px] text-body-text leading-relaxed">
                Every feature you need shipped out of the box &mdash; real-time, offline, automation, and more.
              </p>
            </div>

            <BentoGrid />
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10"><div className="h-px bg-hairline" /></div>

        {/* ═══════════════ AI FEATURES ═══════════════ */}
        <section id="ai-features" className="w-full px-4 sm:px-6 lg:px-10 py-20 lg:py-28">
          <div className="max-w-5xl mx-auto">
            <div className="max-w-2xl mb-12 lg:mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-hairline bg-accent-soft mb-4">
                <Sparkles className="size-3 text-accent" />
                <span className="text-xs font-medium text-accent tracking-wide">AI-Powered</span>
              </div>
              <h2 className="display-lg text-ink mb-3">Intelligence built into every workflow.</h2>
              <p className="text-[15px] text-body-text leading-relaxed">
                Machine learning models that adapt to your team and help you ship faster.
              </p>
            </div>
            <div className="grid gap-px bg-hairline grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 rounded-xl overflow-hidden border border-hairline">
              {[
                { title: "Smart Task Prioritization", desc: "AI analyzes dependencies, deadlines, and workload to suggest optimal ordering.", stat: "3.2x", statLabel: "faster completion" },
                { title: "Automated Sprint Planning", desc: "Generate sprint backlogs from goals. AI estimates story points from velocity.", stat: "85%", statLabel: "time saved planning" },
                { title: "Intelligent Resource Allocation", desc: "AI recommends assignments based on skills, balance, and deadline pressure.", stat: "40%", statLabel: "fewer bottlenecks" },
                { title: "Predictive Deadline Tracking", desc: "Forecast completion dates with models that learn from your delivery patterns.", stat: "94%", statLabel: "forecast accuracy" },
                { title: "Natural Language Search", desc: "Find any task or board by typing natural queries. AI understands intent.", stat: "2.5x", statLabel: "faster search" },
                { title: "Code Review Reminders", desc: "AI monitors PRs and nudges reviewers when a linked PR waits too long.", stat: "60%", statLabel: "faster reviews" },
              ].map((f) => (
                <div key={f.title} className="bg-canvas p-6 lg:p-8 flex flex-col justify-between gap-4 hover:bg-canvas-soft transition-colors">
                  <div>
                    <div className="inline-flex items-center gap-2 mb-3 lg:mb-4">
                      <span className="text-accent font-bold text-sm bg-accent-soft px-2 py-0.5 rounded-md">{f.stat}</span>
                    </div>
                    <h3 className="text-sm lg:text-base font-semibold text-ink mb-1.5">{f.title}</h3>
                    <p className="text-[13px] lg:text-sm text-body-text leading-relaxed">{f.desc}</p>
                  </div>
                  <div className="text-xs text-accent font-medium">{f.statLabel}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10"><div className="h-px bg-hairline" /></div>

        {/* ═══════════════ PRICING ═══════════════ */}
        <section id="pricing" className="w-full px-4 sm:px-6 lg:px-10 py-20 lg:py-28">
          <div className="max-w-5xl mx-auto">
            <div className="max-w-2xl mb-12 lg:mb-16">
              <h2 className="display-lg text-ink mb-3">Simple, transparent pricing.</h2>
              <p className="text-[15px] text-body-text leading-relaxed">
                No hidden fees. No complexity. Start free and scale as you grow.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3 items-stretch">
              {[
                { plan: "Starter", price: "$0", period: "forever", desc: "For small teams getting started.", features: ["Up to 5 members", "3 boards", "Basic automation", "Community support"], cta: "Get Started" },
                { plan: "Pro", price: "$19", period: "per member / month", desc: "For growing teams that need more power.", features: ["Unlimited members", "Unlimited boards", "Advanced automation", "Priority support", "Sprint planning", "Analytics", "AI features"], cta: "Start Free Trial", featured: true },
                { plan: "Enterprise", price: "Custom", period: "tailored pricing", desc: "For organizations with unique requirements.", features: ["Everything in Pro", "SSO & SAML", "Audit logs", "Dedicated support", "Custom integrations", "SLA guarantee"], cta: "Contact Sales" },
              ].map((p) => (
                <div key={p.plan} className={`bg-canvas rounded-xl border ${p.featured ? "border-accent shadow-lg shadow-accent/[0.08] relative" : "border-hairline"} p-6 lg:p-8 flex flex-col h-full`}>
                  {p.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent rounded-full text-[11px] font-medium text-on-primary">
                      Most Popular
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-ink mb-1">{p.plan}</div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl lg:text-4xl font-bold text-ink tracking-tight">{p.price}</span>
                      {p.period !== "forever" && p.period !== "tailored pricing" && (
                        <span className="text-sm text-body-text">/ {p.period}</span>
                      )}
                    </div>
                    {(p.period === "forever" || p.period === "tailored pricing") && (
                      <span className="text-sm text-body-text">{p.period}</span>
                    )}
                    <p className="text-[13px] lg:text-sm text-body-text mt-3 lg:mt-4 mb-5 lg:mb-6">{p.desc}</p>
                    <ul className="space-y-2.5 lg:space-y-3 mb-6 lg:mb-8">
                      {p.features.map((f) => (
                        <li key={f} className="text-[13px] lg:text-sm text-ink flex items-center gap-2">
                          <Check className="size-3.5 shrink-0 text-accent" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/signup" className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors mt-auto ${p.featured ? "bg-accent text-on-primary hover:bg-accent-strong" : "border border-hairline text-ink hover:bg-canvas-soft"}`}>
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10"><div className="h-px bg-hairline" /></div>

        {/* ═══════════════ CTA ═══════════════ */}
        <section className="w-full px-4 sm:px-6 lg:px-10 py-20 lg:py-28">
          <div className="max-w-3xl mx-auto text-center relative overflow-hidden rounded-2xl border border-hairline p-12 lg:p-16">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-accent/[0.03] pointer-events-none" />
            <div className="relative">
              <h2 className="display-lg text-ink mb-4">Ready to ship faster?</h2>
              <p className="text-[15px] text-body-text leading-relaxed max-w-[420px] mx-auto mb-8">
                Join thousands of teams already using SmartTask to organize, collaborate, and deliver.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent text-on-primary px-6 py-3 text-sm font-medium hover:bg-accent-strong transition-colors shadow-sm">
                  Start Building for Free
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link href="#demo" className="inline-flex items-center justify-center rounded-lg border border-hairline text-ink px-6 py-3 text-sm font-medium hover:bg-canvas-soft transition-colors">
                  Watch Demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="w-full px-4 sm:px-6 lg:px-10 border-t border-hairline bg-canvas">
        <div className="max-w-5xl mx-auto py-10 lg:py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-3">
                <LogoIcon size={26} />
                <span className="text-sm font-semibold text-ink">SmartTask</span>
              </Link>
              <p className="text-[13px] text-body-text leading-relaxed max-w-[240px]">
                Modern project management for teams who ship.
              </p>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Demo", "Changelog"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[13px] font-semibold text-ink mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <Link href="#" className="text-[13px] text-body-text hover:text-ink transition-colors">{l}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 lg:mt-10 pt-6 lg:pt-8 border-t border-hairline flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-xs text-muted-text">&copy; 2026 SmartTask Inc. All rights reserved.</p>
            <div className="flex gap-5">
              {["Twitter", "GitHub", "LinkedIn"].map((s) => (
                <Link key={s} href="#" className="text-xs text-muted-text hover:text-ink transition-colors">{s}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ── Bento Grid Component ── */
function BentoGrid() {
  const cards = [
    {
      title: "Real-time Kanban Board",
      desc: "Drag-and-drop task management with live updates across every connected client. Create columns, set WIP limits, and move tasks in real time via Socket.io.",
      icon: Grid3X3,
      tags: ["Drag & drop", "WIP limits", "Live sync", "Custom columns"],
      span: "sm:col-span-2",
    },
    {
      title: "Sprint Planning",
      desc: "Plan and track sprints with backlog management, velocity tracking, and auto-migration of incomplete tasks.",
      icon: Calendar,
      tags: ["Velocity", "Backlog", "Auto-migrate"],
      span: "",
    },
    {
      title: "RBAC & Permissions",
      desc: "Three role levels \u2014 Admin, Manager, Member \u2014 with granular board-level access and route guards on every action.",
      icon: ShieldCheck,
      tags: ["Admin", "Manager", "Member", "Route guards"],
      span: "",
    },
    {
      title: "Task Automation Engine",
      desc: "Automate workflows with trigger-action rules. Auto-move tasks on status change, enforce WIP limits, send notifications, and run review actions.",
      icon: Workflow,
      tags: ["Triggers", "Actions", "WIP enforcement", "Auto-move"],
      span: "sm:col-span-2",
    },
    {
      title: "Offline Support",
      desc: "Full offline mode via IndexedDB. Queue changes locally and sync automatically when connection restores.",
      icon: WifiOff,
      tags: ["IndexedDB", "Auto-sync", "Queue"],
      span: "",
    },
    {
      title: "Audit Logs & Undo",
      desc: "Every action is logged with IP tracking. Undo any change within a 30-second window via the audit trail.",
      icon: BarChart3,
      tags: ["30s undo", "IP tracking", "Full history"],
      span: "",
    },
    {
      title: "Epics & Issue Links",
      desc: "Group tasks into epics with status transitions. Create bidirectional links between tasks \u2014 blocks, blocked-by, relates-to.",
      icon: GitBranch,
      tags: ["Epics", "Bidirectional links", "Status flow"],
      span: "",
    },
    {
      title: "Board Templates",
      desc: "Start instantly with four pre-built templates: Scrum Sprint, Kanban Board, Product Launch, and Bug Tracking.",
      icon: LayoutTemplate,
      tags: ["Scrum", "Kanban", "Product Launch", "Bug Tracking"],
      span: "sm:col-span-2",
    },
    {
      title: "Real-time Notifications",
      desc: "Receive instant alerts for task assignments, status changes, mentions, review requests, and sprint events.",
      icon: Bell,
      tags: ["Socket.io", "Preferences", "Bell badge"],
      span: "",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
      {cards.map((c) => (
        <div key={c.title} className={`${c.span} bg-canvas border border-hairline rounded-xl p-6 lg:p-8 flex flex-col group hover:border-accent/20 hover:shadow-md transition-all duration-300`}>
          <div className="size-9 lg:size-10 rounded-lg bg-accent-soft flex items-center justify-center mb-4 lg:mb-5">
            <c.icon className="size-5 text-accent" />
          </div>
          <h3 className="text-sm lg:text-base font-semibold text-ink mb-1.5">{c.title}</h3>
          <p className="text-[13px] lg:text-sm text-body-text leading-relaxed mb-auto">{c.desc}</p>
          <div className="flex flex-wrap gap-2 mt-4 lg:mt-5 pt-4 lg:pt-5 border-t border-hairline">
            {c.tags.map((t) => (
              <span key={t} className="text-[11px] font-medium text-body-text bg-canvas-soft px-2 py-1 rounded">{t}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
