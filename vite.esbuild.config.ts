import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// ESBuild-only configuration to avoid Rollup issues completely
export default defineConfig({
  server: {
    host: "::",
    port: 10000,
  },
  build: {
    // Use esbuild for everything to avoid Rollup
    minify: "esbuild",
    target: "esnext",
    
    // Disable Rollup-specific features
    rollupOptions: undefined,
    
    // Minimal settings to reduce complexity
    sourcemap: false,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    
    // Force single chunk to avoid complex bundling
    lib: undefined,
    assetsInlineLimit: 0,
    
    // Use modern output format
    outDir: "dist",
    emptyOutDir: true,
  },
  
  // Maximum esbuild optimization
  esbuild: {
    target: "esnext",
    format: "esm",
    minify: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    drop: ["console", "debugger"],
    keepNames: false,
    treeShaking: true,
  },
  
  // Minimal plugins
  plugins: [
    react({
      fastRefresh: false,
      jsxRuntime: "automatic",
    }),
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  
  // Production-only settings
  define: {
    __DEV__: false,
    "process.env.NODE_ENV": '"production"',
  },
});
