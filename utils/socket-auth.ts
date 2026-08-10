/**
 * Browser-side Socket.IO token fetcher.
 *
 * The JWT lives ONLY in the httpOnly `session` cookie. This module fetches it
 * from the same-origin `/api/auth/socket-token` route (the cookie is sent
 * automatically) and caches the result IN MEMORY for the lifetime of the page.
 *
 * It is NEVER written to localStorage, so it can never go stale across
 * login/logout — every full page load re-fetches the current token.
 */

let cachedToken: string | null = null
let inflight: Promise<string | null> | null = null

export async function fetchSocketToken(): Promise<string | null> {
  if (cachedToken) return cachedToken
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch('/api/auth/socket-token', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!res.ok) return null
      const data = (await res.json()) as { token?: string }
      cachedToken = data.token || null
      return cachedToken
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function clearSocketTokenCache() {
  cachedToken = null
}
