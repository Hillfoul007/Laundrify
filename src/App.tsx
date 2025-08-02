import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "@/contexts/NotificationContext";
import LaundryIndex from "@/pages/LaundryIndex";
import LocationConfigPage from "@/pages/LocationConfigPage";
import ErrorBoundary from "@/components/ErrorBoundary";
import InstallPrompt from "@/components/InstallPrompt";
import PWAUpdateNotification from "@/components/PWAUpdateNotification";
import AddressSearchDemo from "@/components/AddressSearchDemo";
import MapsPerformanceIndicator from "@/components/MapsPerformanceIndicator";
import ReferralLoginPage from "@/pages/ReferralLoginPage";
import UnifiedAuthDemo from "@/components/UnifiedAuthDemo";
import {
  initializeAuthPersistence,
  restoreAuthState,
} from "@/utils/authPersistence";
import { initializePWAUpdates } from "@/utils/swCleanup";
import "./App.css";
import "./styles/mobile-fixes.css";
import "./styles/mobile-touch-fixes.css";

function App() {
  // Initialize unified authentication and caching
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app with unified authentication and caching');

      // Auto-clear cart on deploy (only once)
      const versionKey = "catalogue-version-v3-unified";
      if (!localStorage.getItem(versionKey)) {
        localStorage.removeItem("cart");
        localStorage.setItem(versionKey, "true");
        console.log('🧹 Cart cleared for unified auth update');
      }

      // Initialize unified auth persistence (replaces device-specific logic)
      initializeAuthPersistence();

      // Initialize PWA updates and service worker cleanup
      initializePWAUpdates();

      // Restore authentication state using unified service
      const restored = await restoreAuthState();
      if (restored) {
        console.log('✅ Unified authentication initialized successfully');
      } else {
        console.log('ℹ️ No existing session found - unified auth ready for new login');
      }
    };

    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<LaundryIndex />} />
              <Route path="/login" element={<ReferralLoginPage />} />
              <Route path="/refer" element={<ReferralLoginPage />} />
              <Route path="/address-demo" element={<AddressSearchDemo />} />
              <Route path="/unified-auth-demo" element={<UnifiedAuthDemo />} />
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
