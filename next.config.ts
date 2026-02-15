import path from "path";
import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudinary.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "radix-ui",
      "@radix-ui/react-popover",
      "@radix-ui/react-separator",
    ],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization ??= {};
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          // Framework (React, Next) – keep core small and predictable
          framework: {
            name: "framework",
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            priority: 40,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Charts – already lazy-loaded with dashboard content
          charts: {
            name: "charts",
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            priority: 35,
            reuseExistingChunk: true,
          },
          // UI (Radix, TanStack Table) – loaded when dashboard/forms/tables are used
          ui: {
            name: "ui",
            test: /[\\/]node_modules[\\/](@radix-ui|radix-ui|@tanstack[\\/]react-table)[\\/]/,
            priority: 30,
            minSize: 20000,
            reuseExistingChunk: true,
          },
          // Forms & validation (Zod) – shared by forms and API validation
          forms: {
            name: "forms",
            test: /[\\/]node_modules[\\/]zod[\\/]/,
            priority: 28,
            minSize: 10000,
            reuseExistingChunk: true,
          },
          // Date utilities – used by dashboard, timesheet, calendar, APIs
          dates: {
            name: "dates",
            test: /[\\/]node_modules[\\/](date-fns|react-day-picker)[\\/]/,
            priority: 28,
            minSize: 20000,
            reuseExistingChunk: true,
          },
          // Remaining vendor code
          vendor: {
            name: "vendor",
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            minSize: 0,
            reuseExistingChunk: true,
          },
          // Shared app code (min 2 chunks)
          common: {
            name: "common",
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }
    return config;
  },
};

const enhanceConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default enhanceConfig(nextConfig);
