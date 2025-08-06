import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "@/contexts/NotificationContext";
import LaundryIndex from "@/pages/LaundryIndex";
import LocationConfigPage from "@/pages/LocationConfigPage";
import AdminPortal from "@/pages/AdminPortal";
import ErrorBoundary from "@/components/ErrorBoundary";
import InstallPrompt from "@/components/InstallPrompt";
import PWAUpdateNotification from "@/components/PWAUpdateNotification";
import AddressSearchDemo from "@/components/AddressSearchDemo";
import MapsPerformanceIndicator from "@/components/MapsPerformanceIndicator";

import {
  initializeAuthPersistence,
  restoreAuthState,
} from "@/utils/authPersistence";
import { initializePWAUpdates } from "@/utils/swCleanup";
import "@/utils/testEnvironment"; // Auto-run environment tests in development
import "./App.css";
import "./styles/mobile-fixes.css";
import "./styles/mobile-touch-fixes.css";

function App() {
  // Initialize authentication persistence and restore user session
  useEffect(() => {
    const initializeAuth = async () => {
      // Auto-clear cart on deploy (only once)
      const versionKey = "catalogue-version-v2";
      if (!localStorage.getItem(versionKey)) {
        localStorage.removeItem("cart");
        localStorage.setItem(versionKey, "true");
      }

      // Initialize auth persistence handlers (storage events, page lifecycle, etc.)
      initializeAuthPersistence();

      // Initialize PWA updates and service worker cleanup
      initializePWAUpdates();

      // Restore authentication state from localStorage
      await restoreAuthState();
    };

    initializeAuth();
  }, []);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<LaundryIndex />} />


              <Route path="/address-demo" element={<AddressSearchDemo />} />
              <Route
                path="/admin/location-config"
                element={<LocationConfigPage />}
              />
              <Route path="*" element={<LaundryIndex />} />
            </Routes>
            <Toaster />
            <InstallPrompt />
            <PWAUpdateNotification />
            <MapsPerformanceIndicator />
          </div>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
