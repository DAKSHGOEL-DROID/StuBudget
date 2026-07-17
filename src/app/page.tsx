import Link from 'next/link'
import { Wallet, Shield, Zap, Target, RefreshCw, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col relative overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-[-30%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-emerald-600/5 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-violet-600/5 blur-[160px] pointer-events-none" />

      {/* Header bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-neutral-50 via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            StuBudget
          </span>
        </div>
        <Link
          href="/dashboard"
          className="py-2.5 px-5 rounded-xl bg-neutral-900 border border-neutral-850 hover:border-neutral-750 text-neutral-200 hover:text-white transition-all text-xs font-semibold"
        >
          Go to Dashboard
        </Link>
      </header>

      {/* Hero section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 flex flex-col justify-center items-center text-center z-10 relative py-20">
        <div className="inline-flex items-center gap-2 bg-emerald-950/20 border border-emerald-900/40 px-4 py-1.5 rounded-full mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
            Designed for College Students
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 max-w-3xl leading-[1.1] bg-gradient-to-b from-neutral-50 via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
          Budgeting shouldn&apos;t be a chore.
        </h1>
        <p className="text-sm sm:text-lg text-neutral-400 mb-10 max-w-xl leading-relaxed">
          Log expenses in under 10 seconds, track irregular income streams, and save for trips with our beautiful, real-time responsive dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20 justify-center w-full max-w-md">
          <Link
            href="/dashboard"
            className="py-4 px-8 rounded-2xl bg-neutral-50 hover:bg-neutral-200 text-neutral-950 font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] text-sm flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            <span>Start Tracking Free</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#features"
            className="py-4 px-8 rounded-2xl bg-neutral-900 border border-neutral-850 hover:border-neutral-750 text-neutral-300 hover:text-white transition-all text-sm font-semibold flex items-center justify-center"
          >
            Explore Features
          </a>
        </div>

        {/* Feature Grid */}
        <section id="features" className="w-full pt-16 border-t border-neutral-900">
          <h2 className="text-2xl font-bold mb-12 bg-gradient-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            Built for how you live and spend
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* Quick add */}
            <div className="bg-[#18181b]/30 border border-neutral-900 p-6 rounded-3xl backdrop-blur-xl">
              <Zap className="h-6 w-6 text-emerald-400 mb-4" />
              <h3 className="font-bold text-sm text-neutral-200 mb-1.5">Under 10s Quick-Add</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Log a purchase on your phone in three taps right at the counter. Zero friction.
              </p>
            </div>

            {/* Sync */}
            <div className="bg-[#18181b]/30 border border-neutral-900 p-6 rounded-3xl backdrop-blur-xl">
              <RefreshCw className="h-6 w-6 text-emerald-400 mb-4" />
              <h3 className="font-bold text-sm text-neutral-200 mb-1.5">Instant Cross-Device Sync</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Google login links your phone and laptop instantly. Stored securely in the cloud.
              </p>
            </div>

            {/* Budgets */}
            <div className="bg-[#18181b]/30 border border-neutral-900 p-6 rounded-3xl backdrop-blur-xl">
              <Shield className="h-6 w-6 text-emerald-400 mb-4" />
              <h3 className="font-bold text-sm text-neutral-200 mb-1.5">Visual Spending Caps</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Green, amber, and red limits warn you before you overspend. No financial guilt.
              </p>
            </div>

            {/* Savings */}
            <div className="bg-[#18181b]/30 border border-neutral-900 p-6 rounded-3xl backdrop-blur-xl">
              <Target className="h-6 w-6 text-emerald-400 mb-4" />
              <h3 className="font-bold text-sm text-neutral-200 mb-1.5">Milestone Savings Goals</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Save for textbooks, gadgets, or Spring Break. Celebrate with confetti when you reach them!
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 border-t border-neutral-900/60 z-10 relative">
        <span className="text-[10px] text-neutral-600 font-medium tracking-wide">
          © 2026 STUBUDGET • SECURE & PRIVATE PERSONAL FINANCE
        </span>
      </footer>
    </div>
  )
}
