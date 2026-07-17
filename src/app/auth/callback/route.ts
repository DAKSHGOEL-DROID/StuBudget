import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Query profile onboarding status
        const { data: profile } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('id', user.id)
          .single()

        const hasCompleted = profile?.has_completed_onboarding ?? false

        if (hasCompleted) {
          return NextResponse.redirect(`${origin}/dashboard`)
        } else {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
    }
  }

  // Return user to login page with error query param on failure
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
