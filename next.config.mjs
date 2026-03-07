import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import withBundleAnalyzer from "@next/bundle-analyzer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {},

  serverExternalPackages: ["@vladmandic/human"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com", pathname: "/**" },
      { protocol: "https", hostname: "**.r2.dev", pathname: "/**" },
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

  webpack: (config, { dev, isServer, webpack }) => {
    if (!isServer) {

      // Polyfill Node built-ins that Human/TFJS may reference
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };

      // Force the browser ESM build (includes bundled TFJS, no Node deps)
      config.resolve.alias = {
        ...config.resolve.alias,
        "@vladmandic/human": require.resolve("@vladmandic/human/dist/human.esm.js"),
      };
    }

    if (!dev && !isServer) {
      config.optimization ??= {};
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          // React / Next core — tiny, predictable, always cached
          framework: {
            name: "framework",
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            priority: 40,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Human + bundled TFJS — ~8 MB, isolate so it never pollutes vendor
          human: {
            name: "human-ai",
            test: /[\\/]node_modules[\\/]@vladmandic[\\/]/,
            priority: 36,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Charts — lazy-loaded with dashboard
          charts: {
            name: "charts",
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            priority: 35,
            reuseExistingChunk: true,
          },
          // Radix UI + TanStack Table
          ui: {
            name: "ui",
            test: /[\\/]node_modules[\\/](@radix-ui|radix-ui|@tanstack[\\/]react-table)[\\/]/,
            priority: 30,
            minSize: 20000,
            reuseExistingChunk: true,
          },
          // Zod
          forms: {
            name: "forms",
            test: /[\\/]node_modules[\\/]zod[\\/]/,
            priority: 28,
            minSize: 10000,
            reuseExistingChunk: true,
          },
          // date-fns + react-day-picker
          dates: {
            name: "dates",
            test: /[\\/]node_modules[\\/](date-fns|react-day-picker)[\\/]/,
            priority: 28,
            minSize: 20000,
            reuseExistingChunk: true,
          },
          // Everything else from node_modules
          vendor: {
            name: "vendor",
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            minSize: 0,
            reuseExistingChunk: true,
          },
          // Shared app code used by 2+ chunks
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