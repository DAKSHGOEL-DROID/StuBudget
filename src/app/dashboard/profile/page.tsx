'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDashboard } from '@/components/DashboardContext'
import { User, Wallet, Sparkles, Check, AlertCircle, Coins, HeartHandshake, RefreshCw, Plus, Trash2, Tag, Camera, X, Globe } from 'lucide-react'

const getEmojiDataUrl = (emoji: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="50" fill="%2318181b" stroke="%2310b981" stroke-width="2"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="55">${emoji}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const getInitialsDataUrl = (initials: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="50" fill="%23064e3b" stroke="%2310b981" stroke-width="2"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="42" font-family="sans-serif" font-weight="bold" fill="%2334d399">${initials}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export default function ProfilePage() {
  const { profile, categories, refreshData, formatCurrency, userAvatar, userEmail } = useDashboard()
  const supabase = createClient()

  // User Auth State
  const [userName, setUserName] = useState<string | null>(null)
  const [googlePhoto, setGooglePhoto] = useState<string | null>(null)

  // Avatar Modal States
  const [isAvatarModalOpen, setAvatarModalOpen] = useState(false)
  const [customAvatarUrl, setCustomAvatarUrl] = useState('')
  const [avatarSaveLoading, setAvatarSaveLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // Category Manager States
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍔')
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null)

  // Form States
  const [profileName, setProfileName] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [isIrregular, setIsIrregular] = useState(false)
  const [baseCurrency, setBaseCurrency] = useState('INR')

  // Status States
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserInfo() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.full_name || 'Budget Creator')
        setGooglePhoto(user.user_metadata?.picture || null)
      }
    }
    void loadUserInfo()
  }, [supabase])

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMonthlyIncome(String(profile.monthly_income))
      setIsIrregular(profile.is_irregular_income)
      setBaseCurrency(profile.base_currency)
      setProfileName(profile.full_name || '')
    }
  }, [profile])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !newCategoryName.trim()) return

    setCategoryLoading(true)
    setCategoryError(null)

    try {
      const { error } = await supabase.from('categories').insert({
        profile_id: profile.id,
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
      })

      if (error) throw error

      setNewCategoryName('')
      setNewCategoryIcon('🍔')
      await refreshData()
    } catch (err: unknown) {
      setCategoryError((err as Error).message || 'Failed to add custom category')
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!profile) return

    setCategoryLoading(true)
    setCategoryError(null)

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('profile_id', profile.id)

      if (error) throw error

      setCategoryDeleteId(null)
      await refreshData()
    } catch (err: unknown) {
      setCategoryError((err as Error).message || 'Failed to delete category')
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: profileName.trim(),
          monthly_income: parseFloat(monthlyIncome) || 0,
          is_irregular_income: isIrregular,
          base_currency: baseCurrency,
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      await refreshData()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update profile settings.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAvatar = async (url: string) => {
    if (!url.trim()) return

    setAvatarSaveLoading(true)
    setAvatarError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: url.trim() },
      })

      if (error) throw error

      await refreshData()
      setAvatarModalOpen(false)
    } catch (err: unknown) {
      setAvatarError((err as Error).message || 'Failed to update avatar')
    } finally {
      setAvatarSaveLoading(false)
    }
  }

  const handleCustomAvatarSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSaveAvatar(customAvatarUrl)
  }

  const currencies = [
    { code: 'INR', name: 'Indian Rupee (₹)' },
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'JPY', name: 'Japanese Yen (¥)' },
    { code: 'CAD', name: 'Canadian Dollar (C$)' },
    { code: 'AUD', name: 'Australian Dollar (A$)' },
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Profile & Preferences</h1>
        <p className="text-xs text-neutral-400">
          Manage your account profile, currency options, and income rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account Info Card */}
        <div className="md:col-span-1 bg-[#18181b]/20 border border-neutral-900 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <div
              className="relative group cursor-pointer select-none"
              onClick={() => setAvatarModalOpen(true)}
              title="Change Profile Picture"
            >
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userAvatar}
                  alt="Profile Avatar"
                  className="w-20 h-20 rounded-full border-2 border-emerald-500/30 group-hover:border-emerald-500/60 object-cover shadow-lg transition-all"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 group-hover:border-neutral-700 transition-all">
                  <User className="h-10 w-10" />
                </div>
              )}
              {/* Hover camera overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-neutral-100">
                <Camera className="h-5 w-5" />
              </div>
              <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-neutral-950 border border-[#09090b]">
                <Camera className="h-3.5 w-3.5 font-bold" />
              </span>
            </div>
            <button
              onClick={() => setAvatarModalOpen(true)}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold tracking-wider uppercase border border-emerald-500/10 hover:border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-1 rounded-xl transition-all cursor-pointer"
            >
              Change Avatar
            </button>
          </div>

          <div>
            <h3 className="text-base font-bold text-neutral-100">{profile?.full_name || userName || 'Loading...'}</h3>
            <p className="text-xs text-neutral-500 font-medium">{userEmail || 'Loading...'}</p>
          </div>

          <div className="w-full pt-4 border-t border-neutral-900 flex justify-around text-center text-neutral-400">
            <div>
              <div className="text-xs font-bold text-neutral-200">
                {profile ? formatCurrency(profile.monthly_income) : '—'}
              </div>
              <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">
                Income Cap
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-200">
                {profile?.is_irregular_income ? 'Irregular' : 'Fixed'}
              </div>
              <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">
                Income Flow
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="md:col-span-2 bg-[#18181b]/10 border border-neutral-900 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-900">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <h2 className="text-md font-bold text-neutral-100">Financial Settings</h2>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
              <Check className="h-4 w-4 shrink-0" />
              <span>Profile preferences saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Display Name Input */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                <span>Display Name</span>
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Enter display name..."
                required
              />
            </div>

            {/* Currency Select */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-neutral-400" />
                <span>Base Currency</span>
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Income Value Input */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-neutral-400" />
                <span>Estimated Monthly Income ({baseCurrency})</span>
              </label>
              <input
                type="number"
                step="any"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Enter monthly income limit..."
                required
              />
            </div>

            {/* Income Type Toggle */}
            <div className="bg-neutral-950/50 border border-neutral-900/80 p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <HeartHandshake className="h-4 w-4 text-emerald-400" />
                  <span>Irregular Income Flow</span>
                </span>
                <p className="text-[10px] text-neutral-500 leading-normal max-w-[260px] sm:max-w-[340px]">
                  Turn this on if you are a freelancer or have gig income. Helps adjust budget caps dynamically.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsIrregular(!isIrregular)}
                className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
                  isIrregular ? 'bg-emerald-500' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-neutral-50 absolute top-1 transition-all duration-300 ${
                    isIrregular ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-neutral-50 hover:bg-neutral-200 text-neutral-950 font-bold transition-all text-xs flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-neutral-950" />
              ) : (
                <>
                  <span>Save Preferences</span>
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Category Manager Section */}
      <div className="bg-[#18181b]/10 border border-neutral-900 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-900">
          <Tag className="h-5 w-5 text-emerald-400" />
          <h2 className="text-md font-bold text-neutral-100">Manage Categories</h2>
        </div>

        {categoryError && (
          <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{categoryError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List of current categories */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Current Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-neutral-950/50 border border-neutral-900/80 px-4 py-3 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl p-1.5 rounded-xl bg-neutral-950 border border-neutral-900">{cat.icon}</span>
                    <span className="text-xs font-bold text-neutral-200">{cat.name}</span>
                  </div>
                  
                  {categoryDeleteId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/80 border border-red-900/50 text-red-400 transition-colors text-[10px] font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setCategoryDeleteId(null)}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 transition-colors text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCategoryDeleteId(cat.id)}
                      className="p-2 rounded-xl bg-neutral-950 hover:bg-red-950/30 border border-neutral-900 hover:border-red-900/30 text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-neutral-500 leading-normal italic">
              * Note: Deleting a category will also delete any budgets or transaction records associated with it.
            </p>
          </div>

          {/* Add custom category form */}
          <div className="bg-neutral-950/30 border border-neutral-900 p-5 rounded-2xl space-y-4 h-fit">
            <h3 className="text-xs font-bold text-neutral-300">Create Custom Category</h3>
            
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Category Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Shopping, Rent..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Icon Emoji</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={2}
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="w-12 h-12 bg-neutral-950 border border-neutral-900 rounded-xl text-center text-lg focus:outline-none focus:border-emerald-500 shrink-0 p-0"
                    required
                  />
                  <div className="flex-1 grid grid-cols-6 gap-1 bg-neutral-950/50 border border-neutral-900 p-2 rounded-xl">
                    {['🍔', '🚗', '🎧', '🎬', '🏠', '🛍️', '🏥', '📚', '💰', '📦', '✈️', '⚡'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCategoryIcon(emoji)}
                        className={`aspect-square flex items-center justify-center text-sm hover:bg-neutral-800 rounded-lg transition-colors ${
                          newCategoryIcon === emoji ? 'bg-neutral-800 border border-neutral-700' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={categoryLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition-all text-xs flex items-center justify-center gap-1.5"
              >
                {categoryLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Category</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Avatar Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setAvatarModalOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl space-y-5">
            <button
              onClick={() => setAvatarModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Camera className="h-4.5 w-4.5 text-emerald-400" />
                <span>Customize Profile Picture</span>
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                Choose a pre-designed premium emoji avatar or enter a custom photo URL.
              </p>
            </div>

            {avatarError && (
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{avatarError}</span>
              </div>
            )}

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">
                Emoji Presets
              </label>
              <div className="grid grid-cols-5 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                {[
                  { emoji: '🎓', label: 'Student' },
                  { emoji: '💸', label: 'Cash' },
                  { emoji: '🚀', label: 'Rocket' },
                  { emoji: '🎮', label: 'Gamer' },
                  { emoji: '🎧', label: 'Music' },
                  { emoji: '🍕', label: 'Pizza' },
                  { emoji: '🦄', label: 'Unicorn' },
                  { emoji: '☕', label: 'Coffee' },
                  { emoji: '✈️', label: 'Travel' },
                  { emoji: '✨', label: 'Sparkles' },
                ].map((preset) => {
                  const presetUrl = getEmojiDataUrl(preset.emoji)
                  const isSelected = userAvatar === presetUrl
                  return (
                    <button
                      key={preset.emoji}
                      onClick={() => handleSaveAvatar(presetUrl)}
                      disabled={avatarSaveLoading}
                      className={`aspect-square flex flex-col items-center justify-center rounded-2xl bg-neutral-950 border transition-all cursor-pointer text-2xl hover:scale-[1.05] hover:bg-neutral-900 hover:border-emerald-500/30 ${
                        isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5' : 'border-neutral-900'
                      }`}
                      title={preset.label}
                    >
                      {preset.emoji}
                    </button>
                  )
                })}
                {/* Initials Preset */}
                {(() => {
                  const initials = (profile?.full_name || userName || 'BC')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                  const initialsUrl = getInitialsDataUrl(initials)
                  const isSelected = userAvatar === initialsUrl
                  return (
                    <button
                      onClick={() => handleSaveAvatar(initialsUrl)}
                      disabled={avatarSaveLoading}
                      className={`aspect-square flex items-center justify-center rounded-2xl bg-neutral-950 border transition-all cursor-pointer font-bold text-sm tracking-wider text-emerald-400 hover:scale-[1.05] hover:bg-neutral-900 hover:border-emerald-500/30 ${
                        isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5' : 'border-neutral-900'
                      }`}
                      title="Name Initials"
                    >
                      {initials}
                    </button>
                  )
                })()}
              </div>
            </div>

            {/* Custom URL Field */}
            <form onSubmit={handleCustomAvatarSubmit} className="space-y-2">
              <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">
                Custom Web Image URL
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-900 rounded-xl pl-8.5 pr-3 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                    placeholder="https://images.unsplash.com/photo-..."
                    required
                  />
                  <Globe className="h-3.5 w-3.5 text-neutral-500 absolute left-3 top-3" />
                </div>
                <button
                  type="submit"
                  disabled={avatarSaveLoading}
                  className="px-4 py-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-200 text-neutral-950 text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Restore Google Option */}
            {googlePhoto && userAvatar !== googlePhoto && (
              <div className="pt-2 border-t border-neutral-900">
                <button
                  onClick={() => handleSaveAvatar(googlePhoto)}
                  disabled={avatarSaveLoading}
                  className="w-full py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 transition-all text-xs font-bold text-neutral-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={googlePhoto}
                    alt="Google Original"
                    className="w-5 h-5 rounded-full object-cover border border-neutral-800"
                  />
                  <span>Restore Google Photo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
