import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { LandingRedirect } from '@/components/auth/landing-redirect'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingRedirect />
      {/* Navbar - White sticky header */}
      <nav className="border-b border-[rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-[8px] flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Smart Task</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-nav">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="black" className="text-nav">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - White background with generous spacing */}
      <section className="container mx-auto px-4 py-[100px] md:py-[120px]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="outline" className="px-4 py-1 rounded-[9999px] border-[rgba(0,0,0,0.08)]">
            🚀 Streamline Your Workflow
          </Badge>
          <h1 className="text-display-hero md:text-[4.5rem] font-waldenburg font-light leading-[1.08] tracking-[-0.96px] text-black">
            Task Management with{' '}
            <span className="font-waldenburg font-light">Real-Time Collaboration</span>
          </h1>
          <p className="text-body text-[#4e4e4e] max-w-2xl mx-auto tracking-[0.18px]">
            A modern Kanban platform that enforces flow discipline with live cursors,
            due timelines, and strict role-based access control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/register">
              <Button variant="black" className="text-button px-[14px] py-3 rounded-[9999px]">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="white" className="text-button px-[14px] py-3 rounded-[9999px] border shadow-sm">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Demo Dashboard Interactive Mockup */}
          <div className="mt-16 mx-auto max-w-5xl rounded-xl border bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 fill-mode-both">
            <div className="flex items-center px-4 py-3 border-b bg-muted/30">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="mx-auto bg-white border px-3 py-1 text-xs rounded-md shadow-sm text-muted-foreground flex items-center">
                <Lock className="w-3 h-3 mr-2" /> smart-task-manager.app
              </div>
            </div>
            <div className="flex bg-muted/10 h-[500px]">
              {/* Sidebar */}
              <div className="w-48 border-r bg-white p-4 hidden md:block">
                <div className="space-y-4">
                  <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-muted/50 rounded"></div>
                    <div className="h-4 w-3/4 bg-muted/50 rounded"></div>
                    <div className="h-4 w-5/6 bg-muted/50 rounded"></div>
                  </div>
                </div>
              </div>
              {/* Main Content */}
              <div className="flex-1 p-6 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-8 rounded-full bg-purple-100 border-2 border-white shadow-sm z-10"></div>
                    <div className="h-8 w-8 rounded-full bg-blue-100 border-2 border-white shadow-sm -ml-3 z-20"></div>
                    <div className="h-8 w-8 rounded-full bg-green-100 border-2 border-white shadow-sm -ml-3 z-30"></div>
                  </div>
                </div>
                {/* Kanban Canvas */}
                <div className="flex space-x-4 flex-1">
                  {/* Column 1 */}
                  <div className="w-72 bg-muted/30 rounded-lg p-3 flex flex-col">
                    <div className="flex justify-between items-center mb-3 px-1">
                      <span className="text-sm font-semibold tracking-wide">To Do <Badge variant="secondary" className="ml-2">3</Badge></span>
                    </div>
                    <div className="space-y-3">
                      <Card className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-default">
                        <Badge className="bg-blue-100 text-blue-700 mb-2 hover:bg-blue-100">Design</Badge>
                        <p className="text-sm font-medium mb-4">Create wireframes for new dashboard elements</p>
                        <div className="flex justify-between items-center">
                          <div className="w-6 h-6 rounded-full bg-purple-200"></div>
                          <span className="text-xs text-green-600 font-medium">Due in 3d</span>
                        </div>
                      </Card>
                      <Card className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-default">
                        <Badge className="bg-amber-100 text-amber-700 mb-2 hover:bg-amber-100">Backend</Badge>
                        <p className="text-sm font-medium mb-4">Setup Prisma schema for Automation Rules</p>
                        <div className="flex justify-between items-center">
                          <div className="w-6 h-6 rounded-full bg-blue-200"></div>
                          <span className="text-xs text-amber-600 font-medium">Due tomorrow</span>
                        </div>
                      </Card>
                    </div>
                  </div>
                  {/* Column 2 */}
                  <div className="w-72 bg-muted/30 rounded-lg p-3 flex flex-col border-2 border-transparent transition-colors">
                    <div className="flex justify-between items-center mb-3 px-1">
                      <span className="text-sm font-semibold tracking-wide">In Progress <Badge variant="secondary" className="ml-2">2 / 3</Badge></span>
                    </div>
                    <div className="space-y-3">
                      <Card className="p-3 shadow-md border-primary/20 cursor-default relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1">
                          <div className="flex items-center bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-100 shadow-sm animate-pulse">
                            <span className="mr-1">✏️</span> SJ
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 mb-2 hover:bg-purple-100">Frontend</Badge>
                        <p className="text-sm font-medium mb-4">Implement Live Cursor real-time sync</p>
                        <div className="flex justify-between items-center">
                          <div className="w-6 h-6 rounded-full bg-green-200"></div>
                          <span className="text-xs text-amber-600 font-medium">12 hrs left</span>
                        </div>
                      </Card>
                    </div>
                  </div>
                  {/* Column 3 */}
                  <div className="w-72 bg-muted/30 rounded-lg p-3 flex flex-col opacity-50 hidden lg:flex">
                    <div className="flex justify-between items-center mb-3 px-1">
                      <span className="text-sm font-semibold tracking-wide">Done <Badge variant="secondary" className="ml-2">12</Badge></span>
                    </div>
                    <div className="space-y-3">
                       <Card className="p-3 shadow-sm cursor-default bg-muted/50">
                        <p className="text-sm font-medium text-muted-foreground strike-through mb-4">Research WebSockets vs SSE</p>
                        <div className="w-16 h-2 bg-muted rounded"></div>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Light gray background */}
      <section className="bg-[#f5f5f5] py-[100px]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-section-heading font-waldenburg font-light mb-4 text-black">
              Everything You Need for Efficient Teams
            </h2>
            <p className="text-body text-[#4e4e4e] max-w-2xl mx-auto tracking-[0.18px]">
              Built for agile teams who want to enforce Lean principles without sacrificing
              flexibility.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <Card variant="default" className="bg-white">
              <CardHeader>
                <div className="w-12 h-12 bg-[rgba(0,0,0,0.04)] rounded-[12px] flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-black" />
                </div>
                <CardTitle>Hard WIP Enforcement</CardTitle>
                <CardDescription className="text-body-standard tracking-[0.16px] text-[#4e4e4e]">
                  Physical limits on work-in-progress. Cards cannot be dragged into full
                  columns—no more soft warnings.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2 */}
            <Card variant="default" className="bg-white">
              <CardHeader>
                <div className="w-12 h-12 bg-[rgba(0,0,0,0.04)] rounded-[12px] flex items-center justify-center mb-4">
                  <Eye className="h-6 w-6 text-black" />
                </div>
                <CardTitle>Live Presence & Cursors</CardTitle>
                <CardDescription className="text-body-standard tracking-[0.16px] text-[#4e4e4e]">
                  See exactly who's viewing and editing each task in real-time. No more
                  silent conflicts or overwrites.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3 */}
            <Card variant="default" className="bg-white">
              <CardHeader>
                <div className="w-12 h-12 bg-[rgba(0,0,0,0.04)] rounded-[12px] flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-black" />
                </div>
                <CardTitle>Due Timelines</CardTitle>
                <CardDescription className="text-body-standard tracking-[0.16px] text-[#4e4e4e]">
                  Color-coded countdowns on every card. Green, amber, or red based on
                  urgency—updates every minute.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4 */}
            <Card variant="default" className="bg-white">
              <CardHeader>
                <div className="w-12 h-12 bg-[rgba(0,0,0,0.04)] rounded-[12px] flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-black" />
                </div>
                <CardTitle>Role-Based Access</CardTitle>
                <CardDescription className="text-body-standard tracking-[0.16px] text-[#4e4e4e]">
                  Three-tier hierarchy: Admin, Manager, Member. Each role sees exactly
                  what they need—nothing more.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 5 */}
            <Card variant="default" className="bg-white">
              <CardHeader>
                <div className="w-12 h-12 bg-[rgba(0,0,0,0.04)] rounded-[12px] flex items-center justify-center mb-4">
                  <MousePointer2 className="h-6 w-6 text-black" />
                </div>
                <CardTitle>Focus Mode</CardTitle>
                <CardDescription className="text-body-standard tracking-[0.16px] text-[#4e4e4e]">
                  Press F to hide non-assigned tasks. Perfect for deep work without
                  distractions on busy boards.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 6 */}
            <Card variant="default" className="bg-white">
              <CardHeader>
                <div className="w-12 h-12 bg-[rgba(0,0,0,0.04)] rounded-[12px] flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-black" />
                </div>
                <CardTitle>Flow Metrics</CardTitle>
                <CardDescription className="text-body-standard tracking-[0.16px] text-[#4e4e4e]">
                  Cycle time, lead time, and throughput heatmaps. Understand your
                  workflow with data-driven insights.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Section - White background */}
      <section className="container mx-auto px-4 py-[100px]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-section-heading font-waldenburg font-light text-center mb-12 text-black">
            Why Smart Task Manager?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-medium text-lg mb-4 text-[#4e4e4e]">Trello</h3>
              <ul className="space-y-2 text-small text-[#777169]">
                <li className="flex items-center gap-2">
                  <span className="text-[#777169]">✗</span> No WIP enforcement
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#777169]">✗</span> Limited real-time
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#777169]">✗</span> No role hierarchy
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#777169]">✗</span> Basic metrics
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-4 text-[#4e4e4e]">Jira</h3>
              <ul className="space-y-2 text-small text-[#777169]">
                <li className="flex items-center gap-2">
                  <span className="text-[#777169]">✗</span> Complex & heavy
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#777169]">✗</span> Steep learning curve
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#777169]">✗</span> Admin-intensive
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#777169]">✗</span> Expensive
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-4 text-black">Smart Task</h3>
              <ul className="space-y-2 text-body-standard text-black">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-black" />
                  Hard WIP limits
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-black" />
                  Live cursors & presence
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-black" />
                  Built-in role system
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-black" />
                  Rich flow metrics
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Warm stone background with warm shadow */}
      <section className="container mx-auto px-4 py-[100px] text-center">
        <div className="max-w-2xl mx-auto p-12 rounded-[30px] bg-[rgba(245,242,239,0.8)] shadow-[rgba(78,50,23,0.04)_0px_6px_16px]">
          <h2 className="text-section-heading font-waldenburg font-light mb-4 text-black">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-body text-[#4e4e4e] tracking-[0.18px]">
            Join teams already using Smart Task Manager to deliver faster with less
            stress and greater visibility.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/register">
              <Button variant="black" className="text-button px-[14px] py-3 rounded-[9999px]">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(0,0,0,0.05)] py-8">
        <div className="container mx-auto px-4 text-center text-caption text-[#777169]">
          <p>© 2026 Smart Task Manager. Built with Next.js, shadcn/ui, and better-auth.</p>
        </div>
      </footer>
    </div>
  )
}
