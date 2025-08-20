import { useState, useEffect, useCallback } from 'react';
import CustomerVerificationService, { PendingVerification } from '@/services/customerVerificationService';
import { DVHostingSmsService } from '@/services/dvhostingSmsService';

export const useCustomerVerification = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentVerification, setCurrentVerification] = useState<PendingVerification | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasCheckedOnStartup, setHasCheckedOnStartup] = useState(false);
  
  const verificationService = CustomerVerificationService.getInstance();

  // Update pending count
  const updatePendingCount = useCallback(() => {
    const count = verificationService.getPendingVerifications().length;
    setPendingCount(count);
    console.log(`📊 Pending verifications count: ${count}`);
  }, []);

  // Check for pending verifications
  const checkPendingVerifications = useCallback(async () => {
    console.log('🔍 Checking for pending verifications...');
    
    // Refresh from backend first
    await verificationService.refreshVerifications();
    
    const pending = verificationService.getNextPendingVerification();
    updatePendingCount();
    
    if (pending) {
      console.log('📋 Found pending verification:', pending.id);
      setCurrentVerification(pending);
      return true;
    } else {
      console.log('✅ No pending verifications found');
      setCurrentVerification(null);
      return false;
    }
  }, [updatePendingCount]);

  // Show verification popup
  const showVerificationPopup = useCallback((verification?: PendingVerification) => {
    if (verification) {
      setCurrentVerification(verification);
    } else {
      const next = verificationService.getNextPendingVerification();
      setCurrentVerification(next);
    }
    setIsPopupOpen(true);
    console.log('📱 Showing verification popup');
  }, []);

  // Hide verification popup
  const hideVerificationPopup = useCallback(() => {
    setIsPopupOpen(false);
    setCurrentVerification(null);
    console.log('📱 Hiding verification popup');
  }, []);

  // Check for verifications on app startup
  const checkOnStartup = useCallback(async () => {
    if (hasCheckedOnStartup) return;
    
    console.log('🚀 Checking for pending verifications on app startup...');
    
    // Ensure user is authenticated before checking
    const authService = DVHostingSmsService.getInstance();
    const currentUser = authService.getCurrentUser();
    
    if (!currentUser) {
      console.log('ℹ️ No authenticated user, skipping verification check');
      setHasCheckedOnStartup(true);
      return;
    }

    try {
      const hasPending = await checkPendingVerifications();
      
      if (hasPending) {
        // Delay showing popup to ensure app is fully loaded
        setTimeout(() => {
          showVerificationPopup();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error checking verifications on startup:', error);
    } finally {
      setHasCheckedOnStartup(true);
    }
  }, [hasCheckedOnStartup, checkPendingVerifications, showVerificationPopup]);

  // Handle verification completion
  const handleVerificationComplete = useCallback((approved: boolean, verificationId: string) => {
    console.log(`✅ Verification completed: ${verificationId} - ${approved ? 'APPROVED' : 'REJECTED'}`);
    
    updatePendingCount();
    
    // Check if there are more verifications
    const next = verificationService.getNextPendingVerification();
    if (next && next.id !== verificationId) {
      setCurrentVerification(next);
      // Keep popup open for next verification
    } else {
      hideVerificationPopup();
    }
  }, [updatePendingCount, hideVerificationPopup]);

  // Create demo verification for testing
  const createDemoVerification = useCallback(() => {
    const verificationId = verificationService.createDemoVerification();
    updatePendingCount();
    console.log('🎭 Created demo verification:', verificationId);

    // Show popup with the new verification
    setTimeout(() => {
      showVerificationPopup();
    }, 500);

    return verificationId;
  }, [updatePendingCount, showVerificationPopup]);

  // Force show popup for debugging (especially mobile issues)
  const forceShowPopup = useCallback(() => {
    console.log('🔧 Force showing verification popup for debugging');
    const pending = verificationService.getNextPendingVerification();
    if (pending) {
      console.log('📋 Found pending verification:', pending.id);
      setCurrentVerification(pending);
      setIsPopupOpen(true);
    } else {
      console.log('❌ No pending verifications to show');
      // Create a demo verification for testing
      const demoId = verificationService.createDemoVerification();
      setTimeout(() => {
        const newPending = verificationService.getNextPendingVerification();
        if (newPending) {
          setCurrentVerification(newPending);
          setIsPopupOpen(true);
        }
      }, 100);
    }
  }, []);

  // Listen for verification events
  useEffect(() => {
    const handleNewVerification = (event: CustomEvent) => {
      console.log('📢 New verification pending event:', event.detail);
      updatePendingCount();
      
      // Auto-show popup if not already open
      if (!isPopupOpen) {
        showVerificationPopup(event.detail.verification);
      }
    };

    const handleVerificationCompleted = (event: CustomEvent) => {
      console.log('📢 Verification completed event:', event.detail);
      updatePendingCount();
    };

    window.addEventListener('newVerificationPending', handleNewVerification as EventListener);
    window.addEventListener('verificationCompleted', handleVerificationCompleted as EventListener);

    return () => {
      window.removeEventListener('newVerificationPending', handleNewVerification as EventListener);
      window.removeEventListener('verificationCompleted', handleVerificationCompleted as EventListener);
    };
  }, [isPopupOpen, showVerificationPopup, updatePendingCount]);

  // Check for verifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasCheckedOnStartup) {
        checkPendingVerifications();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [hasCheckedOnStartup, checkPendingVerifications]);

  // Initial count update
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    // State
    isPopupOpen,
    currentVerification,
    pendingCount,
    hasCheckedOnStartup,
    
    // Actions
    showVerificationPopup,
    hideVerificationPopup,
    checkOnStartup,
    checkPendingVerifications,
    handleVerificationComplete,
    createDemoVerification,
    
    // Service access
    verificationService
  };
};

export default useCustomerVerification;
