'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { DashboardProvider, useDashboard } from '@/components/DashboardContext'
import TransactionModal from '@/components/TransactionModal'
import {
  LayoutDashboard,
  History,
  PieChart,
  Target,
  CalendarRange,
  LogOut,
  Plus,
  Wallet,
} from 'lucide-react'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { loading, logOut, setTransactionModalOpen } = useDashboard()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'History', path: '/dashboard/transactions', icon: History },
    { name: 'Budgets', path: '/dashboard/budgets', icon: PieChart },
    { name: 'Savings', path: '/dashboard/goals', icon: Target },
    { name: 'Bills', path: '/dashboard/recurring', icon: CalendarRange },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col justify-center items-center gap-4">
        <div className="h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">
          Syncing Account...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col md:flex-row relative">
      {/* 1. Desktop Sidebar (Hidden on mobile) */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-[#0f0f12] border-r border-neutral-900 p-6 shrink-0 h-screen sticky top-0">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800/80 px-4 py-2.5 rounded-2xl">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <span className="text-md font-bold tracking-tight bg-gradient-to-r from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
              StuBudget
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-emerald-400 border border-neutral-700/55 shadow-sm'
                      : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200 border border-transparent'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-4 pt-6 border-t border-neutral-900">
          {/* Quick Add FAB (Desktop) */}
          <button
            onClick={() => setTransactionModalOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.1)] active:scale-[0.98] text-sm"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Add Transaction</span>
          </button>

          {/* Logout */}
          <button
            onClick={logOut}
            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold text-neutral-400 hover:bg-neutral-900 hover:text-red-400 transition-all border border-transparent"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Top Bar (Hidden on desktop) */}
      <header className="md:hidden flex justify-between items-center px-6 py-4 bg-[#0f0f12] border-b border-neutral-900 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <Wallet className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
            StuBudget
          </span>
        </div>
        <button
          onClick={logOut}
          className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </header>

      {/* 3. Main content area */}
      <main className="flex-1 p-6 pb-24 md:pb-6 overflow-y-auto max-w-full">
        {children}
      </main>

      {/* 4. Mobile Bottom Nav Bar (Hidden on desktop) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f12]/95 border-t border-neutral-900 px-4 py-2 backdrop-blur-lg flex items-center justify-between">
        {/* Render first 2 navigation links */}
        <div className="flex items-center justify-around flex-1">
          {navItems.slice(0, 2).map((item) => {
            const isActive = pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
                  isActive ? 'text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[9px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Center floating "+" FAB button */}
        <div className="relative -top-5 px-3">
          <button
            onClick={() => setTransactionModalOpen(true)}
            className="p-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-[0_0_25px_rgba(16,185,129,0.3)] active:scale-[0.93] transition-all"
          >
            <Plus className="h-6 w-6 font-extrabold" />
          </button>
        </div>

        {/* Render remaining 3 navigation links */}
        <div className="flex items-center justify-around flex-1">
          {navItems.slice(2).map((item) => {
            const isActive = pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
                  isActive ? 'text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[9px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Floating transaction modal mount */}
      <TransactionModal />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  )
}
