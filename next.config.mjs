/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const allowedOrigins = process.env.ALLOWED_ORIGIN?.split(',') || ['http://localhost:3000']
    const cspScriptSrc = process.env.NODE_ENV === 'production'
      ? "'self'"
      : "'self' 'unsafe-eval' 'unsafe-inline'"

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              `script-src ${cspScriptSrc};`,
              "style-src 'self' 'unsafe-inline';",
              "img-src 'self' data: blob: https://*.githubusercontent.com;",
              "font-src 'self' data:;",
              "connect-src 'self' https://*.neon.tech;",
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
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
