'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDashboard } from './DashboardContext'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Calendar, FileText, RefreshCw, AlertCircle } from 'lucide-react'

export default function TransactionModal() {
  const {
    isTransactionModalOpen,
    setTransactionModalOpen,
    categories,
    profile,
    refreshData,
  } = useDashboard()

  const supabase = createClient()

  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isRecurring, setIsRecurring] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isTransactionModalOpen) return null

  const handleClose = () => {
    setAmount('')
    setCategoryId('')
    setNote('')
    setDate(new Date().toISOString().split('T')[0])
    setIsRecurring(false)
    setError(null)
    setTransactionModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (type === 'expense' && !categoryId) {
      setError('Please select a category')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: insertError } = await supabase.from('transactions').insert({
        profile_id: user.id,
        amount: parseFloat(amount),
        type,
        category_id: type === 'expense' ? categoryId : null,
        note: note.trim() || null,
        date,
        is_recurring: isRecurring,
      })

      if (insertError) throw insertError

      await refreshData()
      handleClose()
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal content container */}
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 25, stiffness: 260 }}
          className="relative w-full sm:max-w-lg bg-[#18181b] border-t sm:border border-neutral-800 rounded-t-[2.5rem] sm:rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Header handle for mobile */}
          <div className="w-12 h-1 bg-neutral-800 rounded-full mx-auto mb-5 sm:hidden" />

          {/* Close trigger */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <h3 className="text-xl font-bold mb-6 text-neutral-100 flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-400" />
            <span>Add Transaction</span>
          </h3>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type selector toggle */}
            <div className="grid grid-cols-2 p-1 bg-neutral-950 rounded-2xl border border-neutral-850">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-3 rounded-xl font-bold text-xs transition-all ${
                  type === 'expense'
                    ? 'bg-neutral-800 text-red-400 shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-3 rounded-xl font-bold text-xs transition-all ${
                  type === 'income'
                    ? 'bg-neutral-800 text-emerald-400 shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Income
              </button>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase text-neutral-500">
                Amount ({profile?.base_currency || 'INR'})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 pl-4 pr-12 text-2xl font-extrabold text-neutral-100 focus:outline-none focus:border-emerald-500/80 transition-colors"
                  placeholder="0.00"
                  autoFocus
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-neutral-500">
                  {profile?.base_currency || 'INR'}
                </span>
              </div>
            </div>

            {/* Category selection (Expenses only) */}
            {type === 'expense' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase text-neutral-500">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        categoryId === cat.id
                          ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400'
                          : 'bg-neutral-950 border-neutral-850 hover:border-neutral-750 text-neutral-400'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[10px] font-bold truncate max-w-[80px]">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase text-neutral-500">
                Note / Description
              </label>
              <div className="relative flex items-center">
                <FileText className="absolute left-4 text-neutral-500 h-4.5 w-4.5" />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/80 transition-colors"
                  placeholder="e.g. Starbucks, Tuition textbooks"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase text-neutral-500">
                  Date
                </label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-3 text-neutral-500 h-4 w-4" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500/80 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Recurring Transaction Trigger */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    isRecurring
                      ? 'bg-neutral-800 border-emerald-500/80 text-emerald-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-750'
                  }`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRecurring ? 'animate-spin' : ''}`} />
                  <span>{isRecurring ? 'Recurring Bill' : 'One-time Entry'}</span>
                </button>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-neutral-800/60">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-neutral-50 hover:bg-neutral-200 text-neutral-950 font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.03)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Log Transaction</span>
                    <Plus className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
