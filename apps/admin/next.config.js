const path = require('path');

let withPWA = (config) => config;

try {
  const nextPwaModule = require('next-pwa');
  const createPWA = nextPwaModule.default || nextPwaModule;
  if (typeof createPWA === 'function') {
    const wrapped = createPWA({
      dest: 'public',
      disable: process.env.NODE_ENV === 'development',
    });
    if (typeof wrapped === 'function') {
      withPWA = wrapped;
    }
  }
} catch (_error) {}
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.affilia.co.ke; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.affilia.co.ke https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';"
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ];
  },
};

module.exports = withPWA(nextConfig);
