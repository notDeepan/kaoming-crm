// The app uses next-intl's request config, not its optional message extraction.
// Resolve the request config directly so builds do not load the extraction SWC addon.
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  turbopack: { resolveAlias: { 'next-intl/config': './src/i18n/request.ts' } },
};

export default nextConfig;
