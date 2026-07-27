'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDashboard } from '@/components/DashboardContext'
import {
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Calendar,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import Link from 'next/link'
import { motion } from 'framer-motion'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#64748b']

interface Transaction {
  id: string
  amount: number
  type: 'expense' | 'income'
  date: string
  note: string | null
  category_id: string | null
  categories?: {
    name: string
    icon: string
  } | null
}

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string
}

interface RecurringRule {
  id: string
  amount: number
  type: 'expense' | 'income'
  frequency: string
  next_due_date: string
  note: string | null
  categories?: {
    name: string
    icon: string
  } | null
}

export default function DashboardPage() {
  const { profile, formatCurrency, loading: contextLoading } = useDashboard()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<{ name: string; Spent: number; Income: number }[]>([])
  const [upcomingBills, setUpcomingBills] = useState<RecurringRule[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [overspentCategories, setOverspentCategories] = useState<string[]>([])

  const processRecurringTransactions = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const todayStr = new Date().toISOString().split('T')[0]
      const { data: rules } = await supabase
        .from('recurring_rules')
        .select('*')
        .lte('next_due_date', todayStr)

      if (rules && rules.length > 0) {
        for (const rule of rules) {
          const txsToInsert = []
          const nextDue = new Date(rule.next_due_date)
          const todayDate = new Date(todayStr)

          while (nextDue <= todayDate) {
            txsToInsert.push({
              profile_id: user.id,
              category_id: rule.category_id,
              amount: rule.amount,
              type: rule.type,
              note: rule.note || `Recurring ${rule.type}`,
              date: nextDue.toISOString().split('T')[0],
              is_recurring: true,
            })

            // Increment based on frequency
            if (rule.frequency === 'weekly') {
              nextDue.setDate(nextDue.getDate() + 7)
            } else if (rule.frequency === 'biweekly') {
              nextDue.setDate(nextDue.getDate() + 14)
            } else if (rule.frequency === 'monthly') {
              nextDue.setMonth(nextDue.getMonth() + 1)
            }
          }

          if (txsToInsert.length > 0) {
            // Post the transaction entries
            await supabase.from('transactions').insert(txsToInsert)
          }

          // Advance next due date in rule
          await supabase
            .from('recurring_rules')
            .update({ next_due_date: nextDue.toISOString().split('T')[0] })
            .eq('id', rule.id)
        }
      }
    } catch (e) {
      console.error('Error processing recurring transactions:', e)
    }
  }, [supabase])

  const loadDashboardData = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      // Fetch this month's transactions
      const { data: txs, error: txsError } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .eq('profile_id', profile.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false })

      if (!txsError) {
        setTransactions(txs || [])
      }

      // Fetch upcoming rules (next 14 days)
      const fourteenDaysLater = new Date()
      fourteenDaysLater.setDate(now.getDate() + 14)
      const fourteenDaysLaterStr = fourteenDaysLater.toISOString().split('T')[0]

      const { data: upcoming, error: upcomingError } = await supabase
        .from('recurring_rules')
        .select('*, categories(*)')
        .eq('profile_id', profile.id)
        .gte('next_due_date', now.toISOString().split('T')[0])
        .lte('next_due_date', fourteenDaysLaterStr)
        .order('next_due_date', { ascending: true })

      if (!upcomingError) {
        setUpcomingBills(upcoming || [])
      }

      // Fetch goals
      const { data: activeGoals, error: goalsError } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('profile_id', profile.id)
        .order('target_date', { ascending: true })

      if (!goalsError) {
        setGoals(activeGoals || [])
      }

      // Fetch budgets and calculate overspent categories (incorporating rollover)
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*, categories(*)')
        .eq('profile_id', profile.id)

      // Fetch previous month's transaction spent (for rollover calculations)
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

      const { data: prevTxs, error: prevTxsError } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('profile_id', profile.id)
        .eq('type', 'expense')
        .gte('date', startOfPrevMonth)
        .lte('date', endOfPrevMonth)

      const prevSpentMap: Record<string, number> = {}
      if (!prevTxsError && prevTxs) {
        prevTxs.forEach((tx) => {
          if (tx.category_id) {
            prevSpentMap[tx.category_id] = (prevSpentMap[tx.category_id] || 0) + Number(tx.amount)
          }
        })
      }

      if (budgets && txs) {
        const spentMap: Record<string, number> = {}
        txs
          .filter((t) => t.type === 'expense')
          .forEach((t) => {
            if (t.category_id) {
              spentMap[t.category_id] = (spentMap[t.category_id] || 0) + Number(t.amount)
            }
          })

        const overspent = budgets
          .filter((b) => {
            const baseLimit = Number(b.amount_limit)
            const isRolloverEnabled = b.is_rollover_enabled ?? true
            const prevSpent = prevSpentMap[b.category_id] || 0
            const rollover = (baseLimit > 0 && isRolloverEnabled) ? Math.max(0, baseLimit - prevSpent) : 0
            const adjustedLimit = baseLimit + rollover
            return (spentMap[b.category_id] || 0) > adjustedLimit
          })
          .map((b) => b.categories?.name || 'Unknown')

        setOverspentCategories(overspent)
      }

      // Generate 4-month historical trend
      const trendData = []
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthLabel = d.toLocaleString('default', { month: 'short' })
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]

        const { data: hist } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('profile_id', profile.id)
          .gte('date', start)
          .lte('date', end)

        let expSum = 0
        let incSum = 0
        hist?.forEach((h) => {
          if (h.type === 'expense') expSum += Number(h.amount)
          else incSum += Number(h.amount)
        })

        trendData.push({
          name: monthLabel,
          Spent: expSum,
          Income: incSum,
        })
      }
      setMonthlyTrend(trendData)
    } catch (e) {
      console.error('Error loading dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }, [profile, supabase])

  // Lazy process on component mount
  useEffect(() => {
    const init = async () => {
      if (profile) {
        await processRecurringTransactions()
        await loadDashboardData()
      }
    }
    void init()
  }, [profile, processRecurringTransactions, loadDashboardData])

  // Recalculate KPIs
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const netSavings = totalIncome - totalExpense

  // Category breakdown calculations
  const categorySums: Record<string, { amount: number; icon: string }> = {}
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const catName = t.categories?.name || 'Misc'
      const catIcon = t.categories?.icon || '✨'
      if (!categorySums[catName]) {
        categorySums[catName] = { amount: 0, icon: catIcon }
      }
      categorySums[catName].amount += Number(t.amount)
    })

  const donutData = Object.entries(categorySums).map(([name, val]) => ({
    name,
    value: val.amount,
    icon: val.icon,
  }))

  const topCategory = donutData.length > 0 ? donutData.sort((a, b) => b.value - a.value)[0] : null

  // Daily Safe-to-Spend calculation
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const daysRemaining = Math.max(1, daysInMonth - new Date().getDate() + 1)
  const upcomingBillsTotal = upcomingBills
    .filter((b) => b.type === 'expense')
    .reduce((sum, b) => sum + Number(b.amount), 0)

  const activeIncomeLimit = profile?.monthly_income || 0
  const spendablePool = profile?.is_irregular_income
    ? netSavings
    : (activeIncomeLimit - totalExpense)
  const safeToSpend = Math.max(0, (spendablePool - upcomingBillsTotal) / daysRemaining)

  if (contextLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] gap-3">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">
          Assembling Dashboard...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Dashboard Overview</h1>
          <p className="text-xs text-neutral-400">
            Here&apos;s what your wallet looks like this semester.
          </p>
        </div>
        {overspentCategories.length > 0 && (
          <div className="bg-amber-950/20 border border-amber-900/50 text-amber-400 text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 max-w-sm">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            <span>
              You have exceeded budgets in: <strong>{overspentCategories.join(', ')}</strong>!
            </span>
          </div>
        )}
      </div>

      {/* Safe-to-Spend Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden bg-gradient-to-r from-emerald-950/20 via-[#18181b]/40 to-blue-950/20 border border-neutral-900 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Safe-to-Spend Today
            </span>
            <span className="text-[9px] text-neutral-500 font-bold">
              • {daysRemaining} days left in month
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-neutral-50">
            {formatCurrency(safeToSpend)} <span className="text-xs font-semibold text-neutral-400">/ day</span>
          </h2>
          <p className="text-[10px] text-neutral-500 leading-normal max-w-[480px]">
            Based on {profile?.is_irregular_income ? 'Net Savings' : 'Remaining Allowance'} ({formatCurrency(spendablePool)}) minus upcoming bills ({formatCurrency(upcomingBillsTotal)}) distributed over the remaining days of the month.
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0 z-10">
          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-900 hover:border-neutral-700 text-xs font-semibold text-neutral-300 transition-all hover:text-neutral-100"
          >
            <span>Log an Expense</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="bg-[#18181b]/30 border border-neutral-900 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Monthly Income
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-neutral-50">
              {formatCurrency(totalIncome || profile?.monthly_income || 0)}
            </h3>
            <span className="text-[9px] text-neutral-500 font-medium">
              {profile?.is_irregular_income ? 'Irregular Income Mode' : 'Fixed Monthly Allowance'}
            </span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-[#18181b]/30 border border-neutral-900 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Month Expenses
            </span>
            <div className="p-1.5 rounded-lg bg-red-950/30 border border-red-900/50">
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-neutral-50">
              {formatCurrency(totalExpense)}
            </h3>
            <span className="text-[9px] text-neutral-500 font-medium">
              Logged transactions this calendar month
            </span>
          </div>
        </div>

        {/* Net Savings Card */}
        <div className="bg-[#18181b]/30 border border-neutral-900 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Net Savings
            </span>
            <div className="p-1.5 rounded-lg bg-blue-950/30 border border-blue-900/50">
              <PiggyBank className="h-3.5 w-3.5 text-blue-400" />
            </div>
          </div>
          <div>
            <h3
              className={`text-2xl font-extrabold ${
                netSavings >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(netSavings)}
            </h3>
            <span className="text-[9px] text-neutral-500 font-medium">
              Income minus expenses this month
            </span>
          </div>
        </div>

        {/* Top Category Card */}
        <div className="bg-[#18181b]/30 border border-neutral-900 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Biggest Category
            </span>
            <div className="p-1.5 rounded-lg bg-violet-950/30 border border-violet-900/50">
              <span className="text-xs">{topCategory ? topCategory.icon : '✨'}</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-neutral-50 truncate">
              {topCategory ? topCategory.name : 'None'}
            </h3>
            <span className="text-[9px] text-neutral-500 font-medium">
              {topCategory
                ? `Total spent: ${formatCurrency(topCategory.value)}`
                : 'No expense recorded yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts & Widgets Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-[#18181b]/20 border border-neutral-900 p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-neutral-200">Spending Trends</h2>
            <span className="text-[10px] text-neutral-500 font-semibold uppercase">Last 4 Months</span>
          </div>
          <div className="h-64 w-full">
            {monthlyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">
                No historical records available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#52525b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${profile?.base_currency} ${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#f4f4f5',
                    }}
                  />
                  <Area type="monotone" dataKey="Spent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSpent)" />
                  <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Category Chart */}
        <div className="bg-[#18181b]/20 border border-neutral-900 p-6 rounded-3xl space-y-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-neutral-200">Category Breakdown</h2>
            <span className="text-[10px] text-neutral-500 font-semibold uppercase">Share</span>
          </div>
          <div className="h-44 w-full relative flex items-center justify-center">
            {donutData.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 text-xs">
                No expenses logged this month.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#f4f4f5',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {donutData.length > 0 && (
            <div className="max-h-[100px] overflow-y-auto pr-1 space-y-1">
              {donutData.map((d, index) => (
                <div key={d.name} className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-neutral-300">
                      {d.icon} {d.name}
                    </span>
                  </div>
                  <span className="font-bold text-neutral-100">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bills Widget */}
        <div className="bg-[#18181b]/20 border border-neutral-900 p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-neutral-200">What&apos;s Coming Up</h2>
            <Link
              href="/dashboard/recurring"
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Manage Bills</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingBills.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No recurring bills coming up in the next 14 days.
              </div>
            ) : (
              upcomingBills.map((bill) => (
                <div
                  key={bill.id}
                  className="p-3 bg-neutral-950 border border-neutral-900 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{bill.categories?.icon || '✨'}</span>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">{bill.note}</h4>
                      <p className="text-[9px] text-neutral-500 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-neutral-600" />
                        <span>Due {new Date(bill.next_due_date).toLocaleDateString()}</span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 capitalize">
                          {bill.frequency}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-red-400">
                    - {formatCurrency(bill.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Savings Goals Widget */}
        <div className="bg-[#18181b]/20 border border-neutral-900 p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-neutral-200">Savings Goals</h2>
            <Link
              href="/dashboard/goals"
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>View All Goals</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {goals.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No active savings goals set yet. Set a milestone!
              </div>
            ) : (
              goals.slice(0, 3).map((goal) => {
                const pct = Math.min(100, Math.max(0, (goal.current_amount / goal.target_amount) * 100))
                return (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-neutral-300">{goal.name}</span>
                      <span className="text-neutral-400">
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-850">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-neutral-500">
                      <span>{pct.toFixed(0)}% Completed</span>
                      <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
