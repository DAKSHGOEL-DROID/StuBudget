'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  full_name: string | null
  monthly_income: number
  is_irregular_income: boolean
  base_currency: string
  has_completed_onboarding: boolean
}

interface Category {
  id: string
  name: string
  icon: string
}

interface DashboardContextType {
  profile: Profile | null
  categories: Category[]
  loading: boolean
  isTransactionModalOpen: boolean
  setTransactionModalOpen: (open: boolean) => void
  refreshData: () => Promise<void>
  formatCurrency: (amount: number) => string
  logOut: () => Promise<void>
  userAvatar: string | null
  userEmail: string | null
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserEmail(user.email || null)
      setUserAvatar(user.user_metadata?.avatar_url || null)

      // Fetch Profile and Categories in parallel
      const [{ data: profileData, error: profileError }, { data: categoryData, error: categoryError }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('categories').select('*').eq('profile_id', user.id).order('name', { ascending: true }),
        ])

      if (profileError || !profileData) {
        router.push('/onboarding')
        return
      }

      setProfile(profileData)

      if (!categoryError) {
        setCategories(categoryData || [])
      }
    } catch (err) {
      console.error('Error loading dashboard context:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const refreshData = async () => {
    await loadData()
  }

  const formatCurrency = (amount: number) => {
    const currency = profile?.base_currency || 'INR'
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const logOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <DashboardContext.Provider
      value={{
        profile,
        categories,
        loading,
        isTransactionModalOpen,
        setTransactionModalOpen,
        refreshData,
        formatCurrency,
        logOut,
        userAvatar,
        userEmail,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
