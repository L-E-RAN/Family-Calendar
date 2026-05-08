import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url2 = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key2 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  const supabase = createServerClient(
    url2,
    key2,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/setup')
  const isApiRoute = url.pathname.startsWith('/api')
  const isPublicRoute = url.pathname === '/' || isAuthRoute

  if (!user && !isPublicRoute && !isApiRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    url.pathname = '/today'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
