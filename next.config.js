// @ts-check
const withPWA = require("@ducanh2912/next-pwa").default;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development warnings
  reactStrictMode: true,

  // Allow images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**"
      }
    ]
  },

  // Required for Next.js 16: next-pwa uses a webpack config internally.
  // An empty turbopack config silences the "webpack config with no turbopack config" build error.
  turbopack: {},

  // Extend headers for camera permissions (required for getUserMedia on Android Chrome)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Camera access requires either HTTPS or localhost
          { key: "Permissions-Policy", value: "camera=(self), microphone=()" },
          // Needed by COOP/COEP for SharedArrayBuffer (optional, for future)
          // { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ]
      }
    ];
  }
};

const pwaConfig = withPWA({
  // ── PWA options ────────────────────────────────────────────────────────────
  dest: "public",                     // Workbox output → public/sw.js + workbox-*.js
  cacheOnFrontEndNav: true,           // Cache pages on client navigation
  aggressiveFrontEndNavCaching: true, // Serve pages from cache on reload
  reloadOnOnline: true,               // Refresh from network when connection restored
  // Disable in dev (avoids confusing cache behaviour during development)
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    // Use GenerateSW strategy (simplest for Next.js App Router)
    disableDevLogs: true,
    // Don't pre-cache the CV backend API calls — they need fresh data
    exclude: [/\/api\/cv\//]
  }
})(nextConfig);

module.exports = pwaConfig;
