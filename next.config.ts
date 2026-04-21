import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Local-dev proxy target for /api/admin/*. Only used when DEV_GATEKEEPER_PROXY
// is set — lets the dev server avoid CORS preflights against a non-local
// backend. Production is same-origin behind nginx and ignores this.
const DEV_GATEKEEPER_PROXY = process.env.DEV_GATEKEEPER_PROXY;

const nextConfig: NextConfig = {
  transpilePackages: ['byteforge-aegis-client-js', 'byteforge-loki-logging-ts'],
  output: 'standalone',
  async rewrites() {
    if (!DEV_GATEKEEPER_PROXY) return [];
    return [
      {
        source: '/api/admin/:path*',
        destination: `${DEV_GATEKEEPER_PROXY}/api/admin/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
