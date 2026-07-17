'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDashboard } from '@/components/DashboardContext'
import {
  Search,
  Trash2,
  Edit2,
  X,
  PlusCircle,
  AlertCircle,
  Check,
} from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  type: 'expense' | 'income'
  date: string
  note: string | null
  category_id: string | null
  categories?: {
    id: string
    name: string
    icon: string
  } | null
}

export default function TransactionsPage() {
  const { profile, categories, formatCurrency, refreshData } = useDashboard()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // Edit Form States
  const [editAmount, setEditAmount] = useState('')
  const [editType, setEditType] = useState<'expense' | 'income'>('expense')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const loadTransactions = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .eq('profile_id', profile.id)
        .order('date', { ascending: false })

      if (!error) {
        setTransactions(data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [profile, supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTransactions()
  }, [loadTransactions])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this transaction?')) return

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error

      setTransactions(transactions.filter((t) => t.id !== id))
      await refreshData()
    } catch {
      alert('Failed to delete transaction')
    }
  }

  const startEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setEditAmount(String(tx.amount))
    setEditType(tx.type)
    setEditCategoryId(tx.category_id || '')
    setEditNote(tx.note || '')
    setEditDate(tx.date)
    setEditError(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTx) return
    if (!editAmount || parseFloat(editAmount) <= 0) {
      setEditError('Please enter a valid amount')
      return
    }

    setEditLoading(true)
    setEditError(null)

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          amount: parseFloat(editAmount),
          type: editType,
          category_id: editType === 'expense' ? editCategoryId || null : null,
          note: editNote.trim() || null,
          date: editDate,
        })
        .eq('id', editingTx.id)

      if (error) throw error

      await loadTransactions()
      await refreshData()
      setEditingTx(null)
    } catch (err: unknown) {
      setEditError((err as Error).message || 'Failed to update transaction')
    } finally {
      setEditLoading(false)
    }
  }

  // Filter Logic
  const filteredTransactions = transactions.filter((tx) => {
    // Search Term Match (note or category name)
    const matchesSearch =
      (tx.note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase())

    // Type Match
    const matchesType = typeFilter === 'all' || tx.type === typeFilter

    // Category Match
    const matchesCategory = categoryFilter === 'all' || tx.category_id === categoryFilter

    // Date Range Match
    const matchesStart = !startDate || tx.date >= startDate
    const matchesEnd = !endDate || tx.date <= endDate

    // Amount Range Match
    const matchesMin = !minAmount || tx.amount >= parseFloat(minAmount)
    const matchesMax = !maxAmount || tx.amount <= parseFloat(maxAmount)

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesStart &&
      matchesEnd &&
      matchesMin &&
      matchesMax
    )
  })

  const resetFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setStartDate('')
    setEndDate('')
    setMinAmount('')
    setMaxAmount('')
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] gap-3">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">
          Loading Transactions...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Transaction History</h1>
        <p className="text-xs text-neutral-400">
          Edit, delete, and audit your academic term expenses.
        </p>
      </div>

      {/* Filtering Toolbar */}
      <div className="bg-[#18181b]/20 border border-neutral-900 p-5 rounded-3xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Text Search */}
          <div className="relative flex items-center col-span-1 sm:col-span-2">
            <Search className="absolute left-3.5 text-neutral-500 h-4.5 w-4.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-900 rounded-xl py-3 pl-11 pr-4 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500/80 transition-colors"
              placeholder="Search by notes or category name..."
            />
          </div>

          {/* Reset button */}
          <button
            onClick={resetFilters}
            className="w-full py-3 px-4 rounded-xl border border-neutral-850 hover:border-neutral-750 text-neutral-400 hover:text-neutral-200 transition-all text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>

        {/* Detailed filters grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {/* Type Filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase">Type</label>
            <select
              value={typeFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value as 'all' | 'expense' | 'income')}
              className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2.5 py-2 text-[10px] text-neutral-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2.5 py-2 text-[10px] text-neutral-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-300 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-300 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Min Amount */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase">Min Amount</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-300 focus:outline-none focus:border-emerald-500"
              placeholder="Min"
            />
          </div>

          {/* Max Amount */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-500 uppercase">Max Amount</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-300 focus:outline-none focus:border-emerald-500"
              placeholder="Max"
            />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-[#18181b]/20 border border-neutral-900 rounded-3xl overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 text-xs">
            No transactions found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-900 text-[10px] font-bold text-neutral-500 uppercase bg-[#18181b]/40">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Note</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-900/20 transition-colors">
                    <td className="py-4 px-6 text-neutral-400 font-medium">
                      {new Date(tx.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 font-bold text-neutral-200">
                      {tx.type === 'expense' ? (
                        <div className="flex items-center gap-1.5">
                          <span>{tx.categories?.icon || '🍔'}</span>
                          <span>{tx.categories?.name || 'Expense'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <PlusCircle className="h-4.5 w-4.5" />
                          <span>Income</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-neutral-400 truncate max-w-[200px]">
                      {tx.note || <span className="italic text-neutral-600">No details</span>}
                    </td>
                    <td
                      className={`py-4 px-6 text-right font-extrabold ${
                        tx.type === 'expense' ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {tx.type === 'expense' ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(tx)}
                          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editing Dialog Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setEditingTx(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl space-y-5">
            <button
              onClick={() => setEditingTx(null)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-md font-bold text-neutral-100 flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-emerald-400" />
              <span>Edit Transaction</span>
            </h3>

            {editError && (
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 p-1 bg-neutral-950 rounded-xl border border-neutral-900">
                <button
                  type="button"
                  onClick={() => setEditType('expense')}
                  className={`py-2 rounded-lg font-bold text-[10px] uppercase transition-all ${
                    editType === 'expense' ? 'bg-neutral-800 text-red-400' : 'text-neutral-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('income')}
                  className={`py-2 rounded-lg font-bold text-[10px] uppercase transition-all ${
                    editType === 'income' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Amount</label>
                <input
                  type="number"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Category (Expense only) */}
              {editType === 'expense' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
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

              {/* Note */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase font-semibold">
                  Details / Note
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Starbucks coffee"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="w-full py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-950 font-bold transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  {editLoading ? (
                    <div className="h-4.5 w-4.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Save Changes</span>
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
