import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/auth'

/**
 * Returns the raw session JWT so the browser-side Socket.IO client can
 * authenticate against the standalone Socket.IO server (port 3001).
 *
 * Security model:
 *  - The JWT lives ONLY in the httpOnly `session` cookie (never localStorage).
 *  - This route is same-origin as the app, so the browser sends the cookie
 *    automatically; the token is handed to JS in-memory and never persisted.
 *  - The token is re-fetched on every full page load, so it is always fresh
 *    and can never go stale across login/logout (the previous localStorage
 *    mirror caused "JWT is X but registered as Y" socket auth mismatches).
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // Verify the JWT is well-formed + signed by us before handing it out.
    await decrypt(token)
    return NextResponse.json(
      { token },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    )
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}
