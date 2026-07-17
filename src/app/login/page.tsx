'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Wallet, Shield } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      setError((err as Error).message || 'An error occurred during sign in.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative background glow circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      {/* Main glass card */}
      <div className="w-full max-w-md bg-[#18181b]/50 border border-neutral-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10 flex flex-col items-center">
        {/* App Logo & Header */}
        <div className="flex items-center gap-3 bg-neutral-900/80 border border-neutral-800 px-4 py-2 rounded-full mb-8">
          <Wallet className="h-6 w-6 text-emerald-400" />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-neutral-50 via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            StuBudget
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-br from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
          Student Budgeting, Simplified.
        </h1>
        <p className="text-sm text-neutral-400 text-center mb-8 max-w-[280px]">
          Track irregular income, set caps, and save for goals in one secure dashboard.
        </p>

        {/* Error Callout */}
        {error && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-neutral-50 hover:bg-neutral-200 text-neutral-950 font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <div className="h-5 w-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Footer notes */}
        <div className="mt-8 flex flex-col items-center gap-2 text-[10px] text-neutral-500">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-neutral-600" />
            <span>Secure encryption via Supabase Auth</span>
          </div>
          <span>Google OAuth redirects to secure verification</span>
        </div>
      </div>

      {/* Floating subtle details */}
      <span className="absolute bottom-6 text-[10px] text-neutral-600 font-medium tracking-wide">
        STUBUDGET v1.0 • DESIGNED FOR COLLEGE STUDENTS
      </span>
    </div>
  )
}
