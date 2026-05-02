import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DemoKanban } from "@/components/demo-kanban"

export default async function LandingPage() {
  const session = await getSession()

  // Proactive redirect if logged in
  if (session) {
    if (session.role === 'ADMIN') redirect('/admin')
    if (session.role === 'MANAGER') redirect('/manager')
    if (session.role === 'MEMBER') redirect('/member')
  }

  return (
    <div className="flex flex-col min-h-screen selection:bg-primary/30 selection:text-primary">
      {/* Navbar */}
      <header className="px-4 lg:px-6 h-20 flex items-center border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2 group" href="#">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
            S
          </div>
          <span className="font-bold text-xl tracking-tight">SmartTask</span>
        </Link>
        <nav className="ml-auto flex gap-6 sm:gap-10">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#pricing">
            Pricing
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#about">
            About
          </Link>
        </nav>
        <div className="ml-8 flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-semibold px-6">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button className="font-semibold px-6 shadow-md shadow-primary/20">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-24 md:py-32 lg:py-48 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[url('/noise.svg')] opacity-20 pointer-events-none"></div>
          <div className="container px-4 md:px-6 mx-auto text-center space-y-8 relative z-10">
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase mb-4 animate-fade-in">
                Intelligent Productivity
              </div>
              <h1 className="text-6xl font-oswald font-bold tracking-tighter sm:text-7xl md:text-8xl lg:text-9xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 leading-[0.85] uppercase py-2">
                Manage Tasks <br />
                <span className="text-primary italic">Faster</span> than ever.
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl lg:text-2xl font-medium leading-relaxed">
                SmartTask helps teams organize, collaborate, and execute with AI-powered task prioritization and real-time updates.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-xl shadow-primary/30">
                  Start Building for Free
                </Button>
              </Link>
              <Link href="#demo">
                <Button variant="outline" size="lg" className="h-14 px-10 text-lg font-bold">
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Interactive Demo Board */}
            <div id="demo" className="mt-24 relative z-10 animate-fade-in-up">
              <DemoKanban />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-24 md:py-32 bg-card/50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center space-y-4 mb-20">
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Everything you need to ship.</h2>
              <p className="text-muted-foreground text-lg max-w-[600px] mx-auto">
                Built for power users and teams who care about speed and aesthetics.
              </p>
            </div>
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Real-time Sync', desc: 'Every change is reflected instantly across all devices.' },
                { title: 'Role-based Access', desc: 'Granular control over who can see and edit what.' },
                { title: 'Smart Automation', desc: 'Automate repetitive tasks with our simple workflow engine.' },
              ].map((f, i) => (
                <div key={i} className="group p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5">
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <div className="size-6 bg-primary rounded-sm"></div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 bg-background">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">S</div>
            <span className="font-bold">SmartTask</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            © 2026 SmartTask Inc. All rights reserved.
          </p>
          <div className="flex gap-8">
            <Link className="text-sm font-medium hover:text-primary" href="#">Privacy</Link>
            <Link className="text-sm font-medium hover:text-primary" href="#">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
