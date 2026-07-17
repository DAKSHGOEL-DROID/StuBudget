'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDashboard } from '@/components/DashboardContext'
import { Edit2, ShieldAlert, Check, X, AlertCircle } from 'lucide-react'

interface Budget {
  id: string
  category_id: string
  amount_limit: number
}

interface CategorySpent {
  categoryId: string
  name: string
  icon: string
  spent: number
  limit: number
  budgetId: string | null
}

export default function BudgetsPage() {
  const { profile, categories, formatCurrency, refreshData } = useDashboard()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [spentData, setSpentData] = useState<Record<string, number>>({})
  
  // Edit State
  const [editingCategory, setEditingCategory] = useState<CategorySpent | null>(null)
  const [newLimit, setNewLimit] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const loadBudgetsAndSpent = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      // 1. Fetch budgets
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('profile_id', profile.id)

      if (!budgetsError) {
        setBudgets(budgetsData || [])
      }

      // 2. Fetch current month's transaction spent
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const { data: txsData, error: txsError } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('profile_id', profile.id)
        .eq('type', 'expense')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)

      if (!txsError && txsData) {
        const spentMap: Record<string, number> = {}
        txsData.forEach((tx) => {
          if (tx.category_id) {
            spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + Number(tx.amount)
          }
        })
        setSpentData(spentMap)
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
    setNewLimit(catSpent.limit > 0 ? String(catSpent.limit) : '')
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
    const spent = spentData[cat.id] || 0
    return {
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      spent,
      limit: budget ? Number(budget.amount_limit) : 0,
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
          const isWarning = pct >= 70 && pct < 100

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
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {hasLimit ? `Limit: ${formatCurrency(item.limit)}` : 'No budget set yet'}
                    </span>
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
                          <span>Overspent</span>
                        </span>
                      ) : (
                        <span>Spent: {formatCurrency(item.spent)}</span>
                      )}
                    </div>
                    <span>{pct.toFixed(0)}% Limit</span>
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
    </div>
  )
}
