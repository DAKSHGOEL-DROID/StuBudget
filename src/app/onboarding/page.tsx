'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Check, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react'

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Subscriptions', icon: '🎧' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Rent', icon: '🏠' },
  { name: 'Textbooks & Supplies', icon: '📚' },
  { name: 'Misc', icon: '✨' },
]

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Step 1 States: Currency & Income
  const [currency, setCurrency] = useState('INR')
  const [incomeMode, setIncomeMode] = useState<'fixed' | 'irregular'>('fixed')
  const [monthlyIncome, setMonthlyIncome] = useState('25000')

  // Step 2 States: Categories Selection
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    DEFAULT_CATEGORIES.map((c) => c.name)
  )

  // Step 3 States: Initial Budget Caps
  const [budgetLimits, setBudgetLimits] = useState<Record<string, string>>({
    Food: '5000',
    Transport: '1500',
    Subscriptions: '1000',
    Entertainment: '2000',
  })

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUserId(user.id)
      }
    }
    fetchUser()
  }, [supabase, router])

  const toggleCategory = (name: string) => {
    if (selectedCategories.includes(name)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== name))
    } else {
      setSelectedCategories([...selectedCategories, name])
    }
  }

  const handleBudgetChange = (catName: string, val: string) => {
    if (/^\d*$/.test(val)) {
      setBudgetLimits({ ...budgetLimits, [catName]: val })
    }
  }

  const handleFinishSetup = async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    try {
      // 1. Update Profile Information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          monthly_income: incomeMode === 'fixed' ? parseFloat(monthlyIncome) || 0 : 0,
          is_irregular_income: incomeMode === 'irregular',
          base_currency: currency,
          has_completed_onboarding: true,
        })
        .eq('id', userId)

      if (profileError) throw profileError

      // 2. Insert selected categories
      const categoriesToInsert = DEFAULT_CATEGORIES.filter((c) =>
        selectedCategories.includes(c.name)
      ).map((c) => ({
        profile_id: userId,
        name: c.name,
        icon: c.icon,
      }))

      if (categoriesToInsert.length > 0) {
        const { data: insertedCats, error: catError } = await supabase
          .from('categories')
          .insert(categoriesToInsert)
          .select()

        if (catError) throw catError

        // 3. Insert budget caps for those categories (if set)
        const budgetsToInsert = insertedCats
          .filter((cat) => budgetLimits[cat.name] && parseInt(budgetLimits[cat.name]) > 0)
          .map((cat) => ({
            profile_id: userId,
            category_id: cat.id,
            amount_limit: parseFloat(budgetLimits[cat.name]),
          }))

        if (budgetsToInsert.length > 0) {
          const { error: budgetError } = await supabase
            .from('budgets')
            .insert(budgetsToInsert)

          if (budgetError) throw budgetError
        }
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setError((err as Error).message || 'An error occurred while finalizing setup.')
      setLoading(false)
    }
  }

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  const [direction, setDirection] = useState(1)

  const goToNextStep = () => {
    setDirection(1)
    setStep((prev) => prev + 1)
  }

  const goToPrevStep = () => {
    setDirection(-1)
    setStep((prev) => prev - 1)
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic background glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* Setup Form Container */}
      <div className="w-full max-w-xl bg-[#18181b]/40 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-semibold tracking-wide uppercase text-neutral-400">
              Onboarding Setup
            </span>
          </div>
          <span className="text-xs bg-neutral-800 px-3 py-1 rounded-full text-neutral-300 font-medium">
            Step {step} of 3
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Step Content */}
        <div className="min-h-[300px] flex flex-col justify-between">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold mb-1">Currency & Income</h2>
                  <p className="text-sm text-neutral-400">
                    Let&apos;s set your starting base currency and how you receive funds.
                  </p>
                </div>

                {/* Currencies Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-neutral-500">
                    Base Currency
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {CURRENCIES.map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => setCurrency(curr.code)}
                        className={`p-3.5 rounded-xl border text-center transition-all duration-200 ${
                          currency === curr.code
                            ? 'bg-neutral-800 border-emerald-500 text-emerald-400'
                            : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="text-xl font-bold mb-0.5">{curr.symbol}</div>
                        <div className="text-[10px] font-semibold text-neutral-400 uppercase">
                          {curr.code}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Income Mode Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-neutral-500">
                      Income Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setIncomeMode('fixed')}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                          incomeMode === 'fixed'
                            ? 'bg-neutral-800/80 border-emerald-500 text-neutral-100'
                            : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                        }`}
                      >
                        <div className="font-semibold text-sm mb-1">Fixed Monthly</div>
                        <div className="text-[10px] leading-relaxed">
                          Consistent allowance, part-time paycheck, or monthly stipend.
                        </div>
                      </button>

                      <button
                        onClick={() => setIncomeMode('irregular')}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                          incomeMode === 'irregular'
                            ? 'bg-neutral-800/80 border-emerald-500 text-neutral-100'
                            : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                        }`}
                      >
                        <div className="font-semibold text-sm mb-1">Irregular Income</div>
                        <div className="text-[10px] leading-relaxed">
                          Gig work, hourly jobs, occasional cash gifts, or freelance shifts.
                        </div>
                      </button>
                    </div>
                  </div>

                  {incomeMode === 'fixed' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-xs font-semibold uppercase text-neutral-500">
                        Monthly Income Amount ({CURRENCIES.find((c) => c.code === currency)?.symbol})
                      </label>
                      <input
                        type="number"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-100 text-sm focus:outline-none focus:border-emerald-500/80 transition-colors"
                        placeholder="Enter amount"
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold mb-1">Choose Budget Categories</h2>
                  <p className="text-sm text-neutral-400">
                    Select categories you spend money on. We will seed these for you.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {DEFAULT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.name)
                    return (
                      <button
                        key={cat.name}
                        onClick={() => toggleCategory(cat.name)}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400'
                            : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cat.icon}</span>
                          <span className="text-xs font-semibold">{cat.name}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold mb-1">Set Starting Budget Caps (Optional)</h2>
                  <p className="text-sm text-neutral-400">
                    Enter maximum monthly spending limits for your selected categories.
                  </p>
                </div>

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {selectedCategories.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-xs">
                      No categories selected in Step 2. Go back to choose categories.
                    </div>
                  ) : (
                    DEFAULT_CATEGORIES.filter((c) => selectedCategories.includes(c.name)).map((cat) => (
                      <div
                        key={cat.name}
                        className="bg-neutral-900/20 border border-neutral-800/80 p-3 rounded-xl flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{cat.icon}</span>
                          <span className="text-xs font-bold text-neutral-200">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2 max-w-[150px]">
                          <span className="text-neutral-500 text-sm font-semibold">
                            {CURRENCIES.find((c) => c.code === currency)?.symbol}
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={budgetLimits[cat.name] || ''}
                            onChange={(e) => handleBudgetChange(cat.name, e.target.value)}
                            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 text-xs text-right focus:outline-none focus:border-emerald-500 w-full"
                            placeholder="Limit"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wizard Footer Controls */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-800/60">
            <button
              onClick={goToPrevStep}
              disabled={step === 1 || loading}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            {step < 3 ? (
              <button
                onClick={goToNextStep}
                disabled={step === 2 && selectedCategories.length === 0}
                className="px-5 py-2.5 rounded-xl bg-neutral-100 text-neutral-950 font-bold hover:bg-neutral-200 active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleFinishSetup}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-extrabold hover:bg-emerald-400 active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Finish Setup</span>
                    <Check className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
