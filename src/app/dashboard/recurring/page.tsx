'use client'

import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDashboard } from '@/components/DashboardContext'
import {
  CalendarRange,
  Plus,
  Trash2,
  Calendar,
  X,
  Check,
  AlertCircle,
  Clock,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

interface RecurringRule {
  id: string
  amount: number
  type: 'expense' | 'income'
  frequency: 'weekly' | 'biweekly' | 'monthly'
  next_due_date: string
  note: string | null
  category_id: string | null
  categories?: {
    name: string
    icon: string
  } | null
}

export default function RecurringPage() {
  const { profile, categories, formatCurrency } = useDashboard()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<RecurringRule[]>([])
  const [isOpen, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly')
  const [nextDueDate, setNextDueDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const loadRules = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*, categories(*)')
        .eq('profile_id', profile.id)
        .order('next_due_date', { ascending: true })

      if (!error) {
        setRules(data || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [profile, supabase])

  useEffect(() => {
    if (!profile) return

    const load = async () => {
      await loadRules()
    }

    void load()
  }, [profile, loadRules])

  const handleCreateRule = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile) return

    if (!amount || parseFloat(amount) <= 0 || !nextDueDate || !frequency) {
      setModalError('Please fill out all required fields')
      return
    }

    if (type === 'expense' && !categoryId) {
      setModalError('Please select a category for the expense')
      return
    }

    setModalLoading(true)
    setModalError(null)

    try {
      const { error } = await supabase.from('recurring_rules').insert({
        profile_id: profile.id,
        amount: parseFloat(amount),
        type,
        frequency,
        next_due_date: nextDueDate,
        category_id: type === 'expense' ? categoryId : null,
        note: note.trim() || null,
      })

      if (error) throw error
      setAmount('')
      setNextDueDate('')
      setCategoryId('')
      setNote('')
      setOpen(false)
      await loadRules()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setModalError(err.message)
      } else {
        setModalError('Failed to create recurring rule')
      }
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled transaction rule?')) return

    try {
      const { error } = await supabase.from('recurring_rules').delete().eq('id', id)
      if (error) throw error
      setRules(rules.filter((rule) => rule.id !== id))
    } catch {
      alert('Failed to delete recurring rule')
    }
  }

  const getProjections = () => {
    const projections: Array<{ date: string; rule: RecurringRule }> = []
    const limitDate = new Date()
    limitDate.setDate(limitDate.getDate() + 30)

    rules.forEach((rule) => {
      const next = new Date(rule.next_due_date)
      while (next <= limitDate) {
        projections.push({
          date: next.toISOString().split('T')[0],
          rule,
        })

        if (rule.frequency === 'weekly') {
          next.setDate(next.getDate() + 7)
        } else if (rule.frequency === 'biweekly') {
          next.setDate(next.getDate() + 14)
        } else {
          next.setMonth(next.getMonth() + 1)
        }
      }
    })

    return projections.sort((a, b) => a.date.localeCompare(b.date))
  }

  const projectedOccurrences = getProjections()

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] gap-3">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">
          Assembling Schedule Rules...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Recurring Bills & Paydays</h1>
          <p className="text-xs text-neutral-400">
            Define recurring items like subscriptions, rent, stipends, or jobs.
          </p>
        </div>
        <button
          onClick={() => {
            setModalError(null)
            setOpen(true)
          }}
          className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition-all text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Rule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
            <CalendarRange className="h-4.5 w-4.5 text-emerald-400" />
            <span>Active Schedules</span>
          </h2>

          {rules.length === 0 ? (
            <div className="bg-[#18181b]/10 border border-neutral-900 border-dashed rounded-3xl p-12 text-center text-neutral-500 text-xs">
              No scheduled transactions created yet. Create a rule to auto-post your subscriptions or stipends.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-[#18181b]/20 border border-neutral-900 p-5 rounded-3xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-2xl bg-neutral-950 border border-neutral-900 shrink-0">
                      {rule.type === 'expense' ? rule.categories?.icon || '🍔' : '💰'}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-200">
                        {rule.note || (rule.type === 'expense' ? rule.categories?.name : 'Income')}
                      </h3>
                      <p className="text-[10px] text-neutral-500 font-medium capitalize flex items-center gap-2 mt-0.5">
                        <span>Every {rule.frequency}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Next due: {new Date(rule.next_due_date).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`text-sm font-extrabold ${
                        rule.type === 'expense' ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {rule.type === 'expense' ? '-' : '+'}
                      {formatCurrency(rule.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-900 text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-emerald-400" />
            <span>Next 30 Days Forecast</span>
          </h2>

          {projectedOccurrences.length === 0 ? (
            <div className="bg-[#18181b]/10 border border-neutral-900 rounded-3xl p-6 text-center text-neutral-600 text-xs italic">
              Create schedules to see projected flows.
            </div>
          ) : (
            <div className="bg-[#18181b]/10 border border-neutral-900 p-5 rounded-3xl max-h-[480px] overflow-y-auto space-y-3">
              {projectedOccurrences.map((proj, idx) => (
                <div
                  key={`${proj.rule.id}-${proj.date}-${idx}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500 font-bold bg-neutral-900 border border-neutral-850 px-2 py-0.5 rounded-lg shrink-0">
                      {new Date(proj.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-neutral-300 truncate max-w-[100px]">
                      {proj.rule.note || (proj.rule.type === 'expense' ? proj.rule.categories?.name : 'Income')}
                    </span>
                  </div>

                  <span
                    className={`font-extrabold flex items-center gap-1 text-[11px] ${
                      proj.rule.type === 'expense' ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {proj.rule.type === 'expense' ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5" />
                    )}
                    {formatCurrency(proj.rule.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl space-y-4">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <CalendarRange className="h-4.5 w-4.5 text-emerald-400" />
                <span>Create Schedule Rule</span>
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                Configure auto-post rules for scheduled items.
              </p>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRule} className="space-y-3.5">
              <div className="grid grid-cols-2 p-1 bg-neutral-950 rounded-xl border border-neutral-900">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 rounded-lg font-bold text-[10px] uppercase transition-all ${
                    type === 'expense' ? 'bg-neutral-800 text-red-400' : 'text-neutral-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 rounded-lg font-bold text-[10px] uppercase transition-all ${
                    type === 'income' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400'
                  }`}
                >
                  Income
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Amount</label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                  required
                />
              </div>

              {type === 'expense' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase font-semibold">
                  Details / Note
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Spotify Premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase font-semibold">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      setFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')
                    }
                    className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-2 py-2 text-[10px] text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">First Due Date</label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-2 py-1.5 text-[10px] text-neutral-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
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
                      <span>Establish Schedule</span>
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
