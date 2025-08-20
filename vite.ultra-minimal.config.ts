import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Ultra-minimal configuration optimized for 512MB memory constraint
export default defineConfig({
  server: {
    host: "::",
    port: 10000,
  },
  build: {
    // Aggressive memory optimization
    chunkSizeWarningLimit: 1000, // Increase to reduce warnings
    rollupOptions: {
      // Single-threaded to minimize memory usage
      maxParallelFileOps: 1,
      output: {
        // Simple chunking strategy to reduce memory overhead
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-avatar'],
        }
      }
    },
    // Use esbuild for fastest, lowest memory minification
    minify: "esbuild",
    // Disable all non-essential features
    cssCodeSplit: false,
    sourcemap: false,
    reportCompressedSize: false,
    assetsInlineLimit: 0, // Don't inline assets to reduce memory usage
    // Use latest JS features to reduce bundle size
    target: 'esnext',
    // Reduce polyfills
    polyfillModulePreload: false,
    // Reduce chunk size to lower memory pressure
    chunkSizeWarningLimit: 500,
  },
  // Minimal esbuild configuration
  esbuild: {
    // Remove console logs and debugger statements
    drop: ["console", "debugger"],
    // Enable all minification options
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    // Use faster transforms
    format: 'esm',
    target: 'esnext',
  },
  plugins: [
    react({
      // Disable fast refresh in production
      fastRefresh: false,
      // Use SWC instead of Babel for better performance
      jsxRuntime: 'automatic',
    }),
    // No PWA plugin or other heavy plugins
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Reduce resolution overhead
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  // Optimize dependencies aggressively
  optimizeDeps: {
    // Only include essential dependencies
    include: ["react", "react-dom"],
    // Exclude heavy dependencies
    exclude: ["vite-plugin-pwa", "@googlemaps/js-api-loader"],
    // Force dependency optimization
    force: true,
  },
  // Reduce memory usage during development
  define: {
    // Remove development-only code
    __DEV__: false,
  },
});
