import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Crucial: calling getUser refreshes the session token if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding')
  const isLoginRoute = request.nextUrl.pathname === '/login'

  if (user) {
    // Read the user profile to check onboarding completion
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_completed_onboarding')
      .eq('id', user.id)
      .single()

    const hasCompleted = profile?.has_completed_onboarding ?? false

    if (!hasCompleted && !isOnboardingRoute && isDashboardRoute) {
      // User is authenticated but needs onboarding, redirect them there
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    if (hasCompleted && isOnboardingRoute) {
      // User already did onboarding, send them to dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if (isLoginRoute) {
      // Authenticated user doesn't need login screen
      const url = request.nextUrl.clone()
      url.pathname = hasCompleted ? '/dashboard' : '/onboarding'
      return NextResponse.redirect(url)
    }
  } else {
    // Anonymous user
    if (isDashboardRoute || isOnboardingRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
