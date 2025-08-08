import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isPWAEnabled = process.env.ENABLE_PWA !== "false";

  // Dynamically import PWA plugin
  let VitePWA;
  if (isPWAEnabled) {
    try {
      VitePWA = require("vite-plugin-pwa").VitePWA;
    } catch (e) {
      console.warn("vite-plugin-pwa not available, PWA features disabled");
    }
  }
  return {
    server: {
      host: "::",
      port: 10000,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          // Add CORS headers for development
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('🔄 Proxying API request:', req.url);
            });
            proxy.on('error', (err, req, res) => {
              console.error('❌ Proxy error:', err);
            });
          }
        },
      },
    },
            build: {
      chunkSizeWarningLimit: 1000,
            rollupOptions: {
        // Minimize parallel operations to reduce memory usage
        maxParallelFileOps: 1,
      },
      // Use esbuild instead of terser for lower memory usage
      minify: mode === "production" ? "esbuild" : false,
      // Disable CSS code splitting to reduce memory usage
      cssCodeSplit: false,
      // Disable sourcemap to save memory
      sourcemap: false,
      // Disable reporting to save memory
      reportCompressedSize: false,
      // Reduce target to minimize polyfills
      target: 'esnext',
    },
    // Enable gzip compression for assets
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    plugins: [
      react({
        // Enable React Fast Refresh for better dev experience
        fastRefresh: true,
      }),
      // Conditionally add PWA plugin
      ...(VitePWA
        ? [
            VitePWA({
              registerType: "autoUpdate", // 🚨 Key for automatic updates
              includeAssets: [
                "favicon.ico",
                "apple-touch-icon.png",
                "masked-icon.svg",
              ],
              manifest: {
                name: "Laundrify - Quick clean & convenient",
                short_name: "Laundrify",
                description: "Quick clean & convenient thats laundrify",
                start_url: "/",
                display: "standalone",
                background_color: "#ffffff",
                theme_color: "#C46DD8",
                icons: [
                  {
                    src: "/laundrify-exact-icon.svg",
                    sizes: "192x192",
                    type: "image/svg+xml",
                  },
                  {
                    src: "/laundrify-exact-icon.svg",
                    sizes: "512x512",
                    type: "image/svg+xml",
                  },
                  {
                    src: "/icons/icon-192x192.png",
                    sizes: "192x192",
                    type: "image/png",
                  },
                  {
                    src: "/icons/icon-512x512.png",
                    sizes: "512x512",
                    type: "image/png",
                  },
                ],
              },
              workbox: {
                cleanupOutdatedCaches: true, // 🚨 Remove old caches
                clientsClaim: true, // 🚨 Take control immediately
                skipWaiting: true, // 🚨 Activate new SW immediately
                runtimeCaching: [
                  {
                    urlPattern: /^https:\/\/cdn\.builder\.io\/.*/i,
                    handler: "CacheFirst",
                    options: {
                      cacheName: "images-cache",
                      expiration: {
                        maxEntries: 100,
                        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                      },
                    },
                  },
                ],
              },
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
