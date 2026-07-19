/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    const cspScriptSrc = isProd
      ? "'self' 'unsafe-inline'"
      : "'self' 'unsafe-eval' 'unsafe-inline'"

    const cacheHeader = isProd
      ? { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
      : { key: 'Cache-Control', value: 'no-cache' }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    const connectSources = [
      "'self'",
      "https://*.neon.tech",
      "https://*.supabase.com",
      "https://*.vercel.app",
      socketUrl.replace(/\/$/, ''),
      new URL(socketUrl).origin.replace(/^http/, 'ws'),
      new URL(socketUrl).origin.replace(/^https/, 'wss'),
      "ws://localhost:3001",
      "wss://*",
    ].join(' ')

    return [
      {
        source: '/:path*',
        headers: [
          cacheHeader,
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              `script-src ${cspScriptSrc};`,
              "style-src 'self' 'unsafe-inline';",
              "img-src 'self' data: blob: https://*.githubusercontent.com;",
              "font-src 'self' data:;",
              `connect-src ${connectSources};`,
              "frame-src 'none';",
              "object-src 'none';",
              "base-uri 'self';",
              "form-action 'self';",
              "frame-ancestors 'none';",
            ].join(' '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [cacheHeader],
      },
      {
        source: '/fonts/:path*',
        headers: [cacheHeader],
      },
      {
        source: '/icons/:path*',
        headers: [cacheHeader],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

export default nextConfig
