/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    tsconfigPath: './tsconfig.json'
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: process.env.APP_URL || 'http://localhost:3001',
  },
  images: {
    domains: ['localhost', 'dealerlogic.ai'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig