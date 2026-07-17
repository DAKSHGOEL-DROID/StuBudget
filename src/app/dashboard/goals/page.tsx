'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDashboard } from '@/components/DashboardContext'
import {
  Target,
  Plus,
  Trash2,
  X,
  Check,
  AlertCircle,
  PiggyBank,
  Sparkles,
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string
}

export default function GoalsPage() {
  const { profile, formatCurrency } = useDashboard()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])

  // Modal States
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [isAddFundsOpen, setAddFundsOpen] = useState(false)
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)

  // Form States
  const [goalName, setGoalName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [fundAmount, setFundAmount] = useState('')

  // Submit states
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const loadGoals = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('profile_id', profile.id)
        .order('target_date', { ascending: true })

      if (!error) {
        setGoals(data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [profile, supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGoals()
  }, [loadGoals])

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!goalName || !targetAmount || !targetDate) {
      setModalError('All fields are required')
      return
    }

    setModalLoading(true)
    setModalError(null)

    try {
      const { error } = await supabase.from('savings_goals').insert({
        profile_id: profile.id,
        name: goalName.trim(),
        target_amount: parseFloat(targetAmount),
        current_amount: 0.00,
        target_date: targetDate,
      })

      if (error) throw error

      setGoalName('')
      setTargetAmount('')
      setTargetDate('')
      setCreateOpen(false)
      await loadGoals()
    } catch (err: unknown) {
      setModalError((err as Error).message || 'Failed to create savings goal')
    } finally {
      setModalLoading(false)
    }
  }

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeGoal) return
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      setModalError('Please enter a valid amount to save')
      return
    }

    setModalLoading(true)
    setModalError(null)

    try {
      const newCurrent = Number(activeGoal.current_amount) + parseFloat(fundAmount)
      const { error } = await supabase
        .from('savings_goals')
        .update({ current_amount: newCurrent })
        .eq('id', activeGoal.id)

      if (error) throw error

      // Trigger Confetti Celebration if goal completed!
      if (newCurrent >= Number(activeGoal.target_amount)) {
        triggerGoalCelebration()
      }

      setFundAmount('')
      setAddFundsOpen(false)
      setActiveGoal(null)
      await loadGoals()
    } catch (err: unknown) {
      setModalError((err as Error).message || 'Failed to allocate funds')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this savings goal?')) return

    try {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id)
      if (error) throw error
      setGoals(goals.filter((g) => g.id !== id))
    } catch {
      alert('Failed to delete goal')
    }
  }

  const triggerGoalCelebration = () => {
    // Beautiful full confetti splash
    const duration = 3 * 1000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10b981', '#3b82f6', '#f59e0b'],
      })
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10b981', '#3b82f6', '#f59e0b'],
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }

  const getDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = target.getTime() - today.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] gap-3">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">
          Fetching Savings Goals...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Savings Goals</h1>
          <p className="text-xs text-neutral-400">
            Set aside cash for textbooks, vacations, or emergency reserves.
          </p>
        </div>
        <button
          onClick={() => {
            setModalError(null)
            setCreateOpen(true)
          }}
          className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition-all text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goals Checklist Grid */}
      {goals.length === 0 ? (
        <div className="bg-[#18181b]/10 border border-neutral-900 border-dashed rounded-3xl p-12 text-center text-neutral-500 text-xs">
          You haven&apos;t created any savings goals yet. Start small and set your first milestone!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const current = Number(goal.current_amount)
            const target = Number(goal.target_amount)
            const pct = Math.min(100, Math.max(0, (current / target) * 100))
            const isCompleted = current >= target
            const daysLeft = getDaysRemaining(goal.target_date)

            return (
              <div
                key={goal.id}
                className={`bg-[#18181b]/20 border p-6 rounded-3xl space-y-4 flex flex-col justify-between transition-all ${
                  isCompleted ? 'border-emerald-500/40 bg-emerald-950/5' : 'border-neutral-900'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-2xl border shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                          : 'bg-neutral-950 border-neutral-900 text-neutral-400'
                      }`}
                    >
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-1.5">
                        <span>{goal.name}</span>
                        {isCompleted && (
                          <span className="bg-emerald-950 border border-emerald-900 text-emerald-400 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase flex items-center gap-1">
                            <Sparkles className="h-3 w-3 animate-pulse" />
                            <span>Met</span>
                          </span>
                        )}
                      </h3>
                      <span className="text-[9px] text-neutral-500 font-medium">
                        Target date: {new Date(goal.target_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress bar info */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end text-xs">
                    <span className="text-neutral-400 text-[10px]">Saved Progress</span>
                    <span className="font-extrabold text-neutral-200">
                      {formatCurrency(current)} / {formatCurrency(target)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-900">
                    <div
                      className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                        isCompleted ? 'from-emerald-500 to-teal-400' : 'from-blue-500 to-indigo-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-neutral-500 font-semibold">
                    <span>{pct.toFixed(0)}% Achieved</span>
                    <span>
                      {isCompleted
                        ? 'Milestone Reached! 🎉'
                        : `${daysLeft} days remaining • ${formatCurrency(Math.max(0, target - current))} left`}
                    </span>
                  </div>
                </div>

                {/* Allocate buttons */}
                {!isCompleted && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setActiveGoal(goal)
                        setModalError(null)
                        setAddFundsOpen(true)
                      }}
                      className="w-full py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-750 text-neutral-200 font-bold transition-all text-xs flex items-center justify-center gap-1.5"
                    >
                      <PiggyBank className="h-4 w-4 text-emerald-400" />
                      <span>Allocate Funds</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE GOAL DIALOG */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setCreateOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl space-y-4">
            <button
              onClick={() => setCreateOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                <span>Create Savings Goal</span>
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                Configure your target budget goal milestone.
              </p>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Goal Name</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Macbook Pro, Spring Break"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Target Amount</label>
                <input
                  type="number"
                  step="any"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-3 rounded-xl bg-neutral-50 hover:bg-neutral-200 text-neutral-950 font-bold transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  {modalLoading ? (
                    <div className="h-4.5 w-4.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Establish Goal</span>
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE FUNDS DIALOG */}
      {isAddFundsOpen && activeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => {
              setAddFundsOpen(false)
              setActiveGoal(null)
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl space-y-4">
            <button
              onClick={() => {
                setAddFundsOpen(false)
                setActiveGoal(null)
              }}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-emerald-400" />
                <span>Save Money: {activeGoal.name}</span>
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                How much money would you like to allocate to this goal?
              </p>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddFunds} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Amount to Save</label>
                <input
                  type="number"
                  step="any"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3.5 py-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                  autoFocus
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-3 rounded-xl bg-neutral-50 hover:bg-neutral-200 text-neutral-950 font-bold transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  {modalLoading ? (
                    <div className="h-4.5 w-4.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Transfer Funds</span>
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
