import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['byteforge-aegis-client-js', 'byteforge-loki-logging-ts'],
  output: 'standalone',
};

export default withNextIntl(nextConfig);
