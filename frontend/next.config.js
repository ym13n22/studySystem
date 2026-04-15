/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  // Enable static export for Electron
  output: 'export',
  // Use relative paths for static assets
  basePath: '',
  assetPrefix: './',
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  async headers() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://studysystem-3.onrender.com';
    
    // Only apply CSP in production
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${backendUrl} https://*.supabase.co;`,
            },
          ],
        },
      ];
    }
    // In development, allow localhost connections
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:3001 ${backendUrl} https://*.supabase.co;`,
          },
        ],
      },
    ];
  },
  // Only use rewrites in development, not in production/static export
  ...(process.env.NODE_ENV !== 'production' && {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ];
    },
  }),
};

module.exports = nextConfig;
