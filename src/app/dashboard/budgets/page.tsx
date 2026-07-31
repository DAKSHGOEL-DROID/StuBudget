'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDashboard } from '@/components/DashboardContext'
import { Edit2, ShieldAlert, Check, X, AlertCircle } from 'lucide-react'

interface Budget {
  id: string
  category_id: string
  amount_limit: number
  is_rollover_enabled: boolean
}

interface CategorySpent {
  categoryId: string
  name: string
  icon: string
  spent: number
  baseLimit: number
  rollover: number
  limit: number
  isRolloverEnabled: boolean
  budgetId: string | null
}

export default function BudgetsPage() {
  const { profile, categories, formatCurrency, refreshData } = useDashboard()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [spentData, setSpentData] = useState<Record<string, number>>({})
  const [prevSpentData, setPrevSpentData] = useState<Record<string, number>>({})
  
  // Edit State
  const [editingCategory, setEditingCategory] = useState<CategorySpent | null>(null)
  const [newLimit, setNewLimit] = useState('')
  const [rolloverEnabled, setRolloverEnabled] = useState(true)
  const [inspectedCategory, setInspectedCategory] = useState<CategorySpent | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const loadBudgetsAndSpent = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

      // Execute all 3 queries in parallel
      const [
        { data: budgetsData, error: budgetsError },
        { data: txsData, error: txsError },
        { data: prevTxsData, error: prevTxsError },
      ] = await Promise.all([
        supabase
          .from('budgets')
          .select('*')
          .eq('profile_id', profile.id),
        supabase
          .from('transactions')
          .select('amount, category_id')
          .eq('profile_id', profile.id)
          .eq('type', 'expense')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth),
        supabase
          .from('transactions')
          .select('amount, category_id')
          .eq('profile_id', profile.id)
          .eq('type', 'expense')
          .gte('date', startOfPrevMonth)
          .lte('date', endOfPrevMonth),
      ])

      if (!budgetsError) {
        setBudgets(budgetsData || [])
      }

      if (!txsError && txsData) {
        const spentMap: Record<string, number> = {}
        txsData.forEach((tx) => {
          if (tx.category_id) {
            spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + Number(tx.amount)
          }
        })
        setSpentData(spentMap)
      }

      if (!prevTxsError && prevTxsData) {
        const prevSpentMap: Record<string, number> = {}
        prevTxsData.forEach((tx) => {
          if (tx.category_id) {
            prevSpentMap[tx.category_id] = (prevSpentMap[tx.category_id] || 0) + Number(tx.amount)
          }
        })
        setPrevSpentData(prevSpentMap)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [profile, supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBudgetsAndSpent()
  }, [loadBudgetsAndSpent])

  const startEdit = (catSpent: CategorySpent) => {
    setEditingCategory(catSpent)
    setNewLimit(catSpent.baseLimit > 0 ? String(catSpent.baseLimit) : '')
    setRolloverEnabled(catSpent.isRolloverEnabled)
    setEditError(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory || !profile) return
    if (!newLimit || parseFloat(newLimit) < 0) {
      setEditError('Please enter a valid positive budget limit')
      return
    }

    setEditLoading(true)
    setEditError(null)

    try {
      const { error } = await supabase.from('budgets').upsert(
        {
          profile_id: profile.id,
          category_id: editingCategory.categoryId,
          amount_limit: parseFloat(newLimit),
          is_rollover_enabled: rolloverEnabled,
        },
        { onConflict: 'profile_id,category_id' }
      )

      if (error) throw error

      await loadBudgetsAndSpent()
      await refreshData()
      setEditingCategory(null)
    } catch (err: unknown) {
      setEditError((err as Error).message || 'Failed to update budget')
    } finally {
      setEditLoading(false)
    }
  }

  // Compile combined data structure
  const categoryBudgets: CategorySpent[] = categories.map((cat) => {
    const budget = budgets.find((b) => b.category_id === cat.id)
    const baseLimit = budget ? Number(budget.amount_limit) : 0
    const isRolloverEnabled = budget ? budget.is_rollover_enabled : true
    const prevSpent = prevSpentData[cat.id] || 0
    const rollover = (baseLimit > 0 && isRolloverEnabled) ? Math.max(0, baseLimit - prevSpent) : 0
    const spent = spentData[cat.id] || 0
    const limit = baseLimit + rollover

    return {
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      spent,
      baseLimit,
      rollover,
      limit,
      isRolloverEnabled,
      budgetId: budget ? budget.id : null,
    }
  })

  // Calculations for total progress overview
  const totalLimitSum = categoryBudgets.reduce((sum, item) => sum + item.limit, 0)
  const totalSpentSum = categoryBudgets.reduce((sum, item) => sum + item.spent, 0)
  const overallPercentage = totalLimitSum > 0 ? (totalSpentSum / totalLimitSum) * 100 : 0

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] gap-3">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">
          Calculating Budgets...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Category Budgets</h1>
        <p className="text-xs text-neutral-400">
          Establish spending caps per category to keep your finances on track.
        </p>
      </div>

      {/* Overall Progress Banner */}
      {totalLimitSum > 0 && (
        <div className="bg-[#18181b]/30 border border-neutral-900 p-6 rounded-3xl space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-neutral-300">
            <span>Overall Monthly Budget Progress</span>
            <span>
              {formatCurrency(totalSpentSum)} spent of {formatCurrency(totalLimitSum)} cap
            </span>
          </div>
          <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-900">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallPercentage >= 100
                  ? 'bg-red-500'
                  : overallPercentage >= 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, overallPercentage)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
            <span>{overallPercentage.toFixed(1)}% Logged</span>
            <span>{formatCurrency(Math.max(0, totalLimitSum - totalSpentSum))} remaining</span>
          </div>
        </div>
      )}

      {/* Grid of Budget Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categoryBudgets.map((item) => {
          const hasLimit = item.limit > 0
          const pct = hasLimit ? (item.spent / item.limit) * 100 : 0
          const isOver = pct >= 100
          const isWarning = pct >= 80 && pct < 100

          return (
            <div
              key={item.categoryId}
              className="bg-[#18181b]/20 border border-neutral-900 p-5 rounded-3xl space-y-4 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-2xl bg-neutral-950 border border-neutral-900 shrink-0">
                    {item.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-200">{item.name}</h3>
                    <div className="text-[10px] text-neutral-500 font-medium">
                      {hasLimit ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-neutral-300">
                            Limit: {formatCurrency(item.limit)}
                          </div>
                          {item.rollover > 0 && (
                            <button
                              onClick={() => setInspectedCategory(item)}
                              className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg w-fit flex items-center gap-1 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            >
                              <span>+{formatCurrency(item.rollover)} rollover added</span>
                              <AlertCircle className="h-3 w-3 shrink-0" />
                            </button>
                          )}
                        </div>
                      ) : (
                        'No budget set yet'
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => startEdit(item)}
                  className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-900 text-neutral-400 hover:text-neutral-200 transition-colors text-xs font-semibold flex items-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Set Cap</span>
                </button>
              </div>

              {hasLimit ? (
                <div className="space-y-2">
                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-900">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-neutral-400 font-medium">
                    <div className="flex items-center gap-1">
                      {isOver ? (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Overspent ({pct.toFixed(0)}%)</span>
                        </span>
                      ) : isWarning ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Approaching Limit ({pct.toFixed(0)}%)</span>
                        </span>
                      ) : (
                        <span>Spent: {formatCurrency(item.spent)}</span>
                      )}
                    </div>
                    <span>{formatCurrency(Math.max(0, item.limit - item.spent))} left</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2.5 text-neutral-600 text-[10px] italic">
                  Tap &quot;Set Cap&quot; to start monitoring this category limit.
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Set Cap Editing Dialog */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setEditingCategory(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl space-y-4">
            <button
              onClick={() => setEditingCategory(null)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <span className="text-lg">{editingCategory.icon}</span>
                <span>Budget Cap: {editingCategory.name}</span>
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                Enter your monthly spending threshold for this category.
              </p>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">
                  Monthly Limit ({profile?.base_currency || 'INR'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3.5 py-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                  autoFocus
                  required
                />
              </div>

              {/* Rollover Toggle */}
              <div className="bg-neutral-950/50 border border-neutral-900/80 p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] font-bold text-neutral-200 block">
                    Accumulate Rollover
                  </span>
                  <span className="text-[9px] text-neutral-500 block leading-normal">
                    Add unspent surplus from the previous month to this month&apos;s cap.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRolloverEnabled(!rolloverEnabled)}
                  className={`w-9 h-5 rounded-full transition-all duration-300 relative shrink-0 ${
                    rolloverEnabled ? 'bg-emerald-500' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-neutral-50 absolute top-1 transition-all duration-300 ${
                      rolloverEnabled ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="w-full py-3 rounded-xl bg-neutral-50 hover:bg-neutral-200 text-neutral-950 font-bold transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  {editLoading ? (
                    <div className="h-4.5 w-4.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Save Limit</span>
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rollover Math Breakdown Modal */}
      {inspectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setInspectedCategory(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl space-y-4">
            <button
              onClick={() => setInspectedCategory(null)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <span className="text-lg">{inspectedCategory.icon}</span>
                <span>Rollover: {inspectedCategory.name}</span>
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                How your monthly budget cap was calculated.
              </p>
            </div>

            <div className="space-y-2.5 pt-2 text-xs text-left">
              <div className="flex justify-between text-neutral-400">
                <span>Base Budget Cap</span>
                <span className="font-semibold text-neutral-200">{formatCurrency(inspectedCategory.baseLimit)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Previous Month Spent</span>
                <span className="font-semibold text-neutral-200">{formatCurrency(prevSpentData[inspectedCategory.categoryId] || 0)}</span>
              </div>
              <div className="border-t border-neutral-900 my-2 pt-2 flex justify-between text-emerald-400 font-medium">
                <span>Surplus Rollover</span>
                <span>+{formatCurrency(inspectedCategory.rollover)}</span>
              </div>
              <div className="border-t border-neutral-800 pt-2.5 flex justify-between text-neutral-100 font-bold text-sm">
                <span>Total Budget Cap</span>
                <span>{formatCurrency(inspectedCategory.limit)}</span>
              </div>
            </div>
            
            <div className="pt-2 text-[9px] text-neutral-500 leading-normal text-left">
              Surplus is calculated as: max(0, Base Cap - Previous Month Spent). Rollover can be toggled on/off in the settings.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
