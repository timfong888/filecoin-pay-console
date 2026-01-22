import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  experimental: {
    // Automatically transform barrel imports to direct imports for better tree-shaking
    // This reduces bundle size by 200-400ms for recharts alone
    optimizePackageImports: ['recharts'],
  },
};

export default nextConfig;
