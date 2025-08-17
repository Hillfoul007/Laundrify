import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import PerformanceMonitor from "./utils/performanceMonitor";

// Initialize performance monitoring
const perfMonitor = PerformanceMonitor.getInstance();
perfMonitor.init();

// Add URL corruption detection and cleanup
if (typeof window !== 'undefined') {
  const currentURL = window.location.href;
  const hasCorruptedURL = /[a-f0-9]{32}-[a-f0-9]{20}\.fly\.dev[a-zA-Z0-9]+/.test(currentURL);

  if (hasCorruptedURL) {
    console.log('🚨 URL corruption detected in main.tsx, clearing cache...');
    // Clear all storage
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(name => caches.delete(name)));
      }
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }

    // Try to redirect to clean URL
    const cleanURL = currentURL.replace(/[a-zA-Z0-9]+$/, '');
    if (cleanURL !== currentURL) {
      window.location.href = cleanURL;
      return;
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
