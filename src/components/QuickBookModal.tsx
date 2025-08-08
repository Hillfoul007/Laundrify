import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle,
  Loader2,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { LocationDetectionService } from "@/services/locationDetectionService";
import LocationUnavailableModal from "./LocationUnavailableModal";

interface QuickBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

const QuickBookModal: React.FC<QuickBookModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  // Check if user is available for conditional rendering within main component
  // Add mobile viewport fix and z-index styles on modal open
  React.useEffect(() => {
    let styleElement: HTMLStyleElement | null = null;

    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      // Fix for iOS Safari viewport issues
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }

      // Add z-index styles for Select dropdown and modal layering
      styleElement = document.createElement('style');
      styleElement.id = 'quick-book-modal-styles';
      styleElement.textContent = `
        [data-radix-popper-content-wrapper] {
          z-index: 999999 !important;
        }
        [data-radix-select-content] {
          z-index: 999999 !important;
        }
        .select-portal {
          z-index: 999999 !important;
        }

        /* Location Unavailable Modal should appear above Quick Book Modal */
        .mobile-modal[data-radix-dialog-content] {
          z-index: 99999999 !important;
        }

        /* Quick Book Modal z-index */
        [data-quick-book-modal] {
          z-index: 50 !important;
        }
      `;
      document.head.appendChild(styleElement);
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';

      // Remove z-index styles
      const existingStyle = document.getElementById('quick-book-modal-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      // Clean up styles on unmount
      if (styleElement && document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [isOpen]);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showLocationUnavailable, setShowLocationUnavailable] = useState(false);
  const [detectedLocationText, setDetectedLocationText] = useState("");
  const [formData, setFormData] = useState({
    pickup_date: "",
    pickup_time: "",
    address: "",
    special_instructions: "",
  });

  const locationDetectionService = LocationDetectionService.getInstance();

  // Get minimum selectable date (today or tomorrow based on available time slots)
  const getMinSelectableDate = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // If it's after 7:30 PM (19:30), user can only book for tomorrow or later
    if (currentHour >= 19 && currentMinute >= 30) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Otherwise, they can book for today if there are available slots
    return now.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (isOpen) {
      const minDate = getMinSelectableDate();
      setFormData(prev => ({
        ...prev,
        pickup_date: minDate,
        pickup_time: "", // Reset time when modal opens
      }));
    }
  }, [isOpen]);

  // Helper function to handle date change and reset time
  const handleDateChange = (newDate: string) => {
    setFormData(prev => ({
      ...prev,
      pickup_date: newDate,
      pickup_time: "", // Reset time when date changes
    }));
  };

  // Validate pickup address for service availability - enhanced to match cart validation
  const validatePickupAddress = async (address: string): Promise<boolean> => {
    if (!address.trim()) return true; // Allow empty for now, will be caught by form validation

    try {
      // Parse address for validation components
      const addressLower = address.toLowerCase();

      // Extract potential pincode - require 6-digit pincode
      const pincodeMatch = address.match(/\b\d{6}\b/);
      const pincode = pincodeMatch ? pincodeMatch[0] : undefined;

      // Validate pincode requirement
      if (!pincode) {
        toast.error("Please include a valid 6-digit pincode in your address");
        return false;
      }

      // Extract potential city and validate sector/keyword requirements
      let city = "unknown";
      let hasRequiredKeywords = false;

      // Check for city keywords
      if (addressLower.includes("gurugram") || addressLower.includes("gurgaon")) {
        city = addressLower.includes("gurugram") ? "gurugram" : "gurgaon";
        hasRequiredKeywords = addressLower.includes("sector") ||
                            addressLower.includes("phase") ||
                            addressLower.includes("block") ||
                            addressLower.includes("dlf") ||
                            addressLower.includes("cyber");
      } else if (addressLower.includes("delhi")) {
        city = "delhi";
        hasRequiredKeywords = addressLower.includes("sector") ||
                            addressLower.includes("block") ||
                            addressLower.includes("colony") ||
                            addressLower.includes("nagar") ||
                            addressLower.includes("vihar") ||
                            addressLower.includes("enclave");
      } else if (addressLower.includes("noida")) {
        city = "noida";
        hasRequiredKeywords = addressLower.includes("sector") ||
                            addressLower.includes("block") ||
                            addressLower.includes("phase");
      } else if (addressLower.includes("faridabad")) {
        city = "faridabad";
        hasRequiredKeywords = addressLower.includes("sector") ||
                            addressLower.includes("block");
      } else if (addressLower.includes("sector")) {
        // If address contains sector but no specific city, assume Gurugram
        city = "gurugram";
        hasRequiredKeywords = true;
      }

      // Validate required keywords for specific areas
      if ((city === "gurugram" || city === "gurgaon") && !hasRequiredKeywords) {
        toast.error("For Gurugram addresses, please include sector/phase/block/DLF/cyber details");
        return false;
      } else if (city === "delhi" && !hasRequiredKeywords) {
        toast.error("For Delhi addresses, please include sector/block/colony/nagar details");
        return false;
      } else if (city === "noida" && !hasRequiredKeywords) {
        toast.error("For Noida addresses, please include sector/block/phase details");
        return false;
      }

      console.log("🔍 Validating address:", { address, city, pincode, hasRequiredKeywords });

      // Check availability using the same logic as cart page
      const availability = await locationDetectionService.checkLocationAvailability(
        city,
        pincode,
        address
      );

      console.log("✅ Address validation result:", availability);

      if (!availability.is_available) {
        setDetectedLocationText(address);
        setShowLocationUnavailable(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating address:", error);
      // Allow address if validation fails (fallback)
      return true;
    }
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Use location service to get proper address if possible
      try {
        const detectedLocation = await locationDetectionService.detectLocationGPS();
        if (detectedLocation) {
          const newAddress = detectedLocation.full_address || `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setFormData(prev => ({ ...prev, address: newAddress }));

          // Validate the detected location
          const isValid = await validatePickupAddress(newAddress);
          if (isValid) {
            toast.success("Location detected and validated!");
          }
        } else {
          // Fallback to coordinates
          const coordAddress = `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setFormData(prev => ({ ...prev, address: coordAddress }));
          await validatePickupAddress(coordAddress);
        }
      } catch (geoError) {
        // Fallback to coordinates
        const coordAddress = `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setFormData(prev => ({ ...prev, address: coordAddress }));
        await validatePickupAddress(coordAddress);
        toast.success("Location coordinates detected!");
      }
    } catch (error) {
      console.error("Location detection failed:", error);
      toast.error("Failed to detect location. Please enter address manually.");
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🚀 CONFIRM QUICK BOOK BUTTON CLICKED!");
    console.log("📋 Form data:", formData);
    console.log("👤 Current user:", currentUser);

    // Validate date
    if (!formData.pickup_date) {
      toast.error("Please select a pickup date");
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(formData.pickup_date);
    const minDate = new Date(getMinSelectableDate());
    if (selectedDate < minDate) {
      toast.error("Please select a current or future date");
      return;
    }

    // Validate time slot is available
    if (!formData.pickup_time) {
      if (availableTimeSlots.length === 0) {
        toast.error("No time slots available for the selected date. Please choose a different date.");
      } else {
        toast.error("Please select a pickup time");
      }
      return;
    }

    // Validate selected time is still available
    if (!availableTimeSlots.includes(formData.pickup_time)) {
      toast.error("Selected time slot is no longer available. Please choose another time.");
      return;
    }

    // Validate address
    if (!formData.address.trim()) {
      toast.error("Please enter a pickup address");
      return;
    }

    // Validate pickup address for service availability
    const isAddressValid = await validatePickupAddress(formData.address);
    if (!isAddressValid) {
      return; // Address validation will show the location unavailable modal
    }

    setLoading(true);
    try {
      // Validate required customer data before submission
      const customerName = currentUser?.name || currentUser?.full_name;
      const customerPhone = currentUser?.phone;
      const customerId = currentUser?._id;

      if (!customerId) {
        toast.error("User ID is missing. Please log in again.");
        return;
      }

      if (!customerName) {
        toast.error("User name is missing. Please update your profile.");
        return;
      }

      if (!customerPhone) {
        toast.error("Phone number is missing. Please update your profile.");
        return;
      }

      const quickBookData = {
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        pickup_date: formData.pickup_date,
        pickup_time: formData.pickup_time,
        address: formData.address,
        special_instructions: formData.special_instructions,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      console.log("📋 Submitting quick book data:", quickBookData);
      console.log("🔧 API Client status:", apiClient.getConnectionStatus());

      const response = await apiClient.request<any>("/quick-book", {
        method: "POST",
        body: quickBookData,
      });

      console.log("📋 Quick book response:", response);

      if (response.data) {
        toast.success("Quick booking created successfully! Our rider will contact you soon.");
        onClose();
        // Reset form
        setFormData({
          pickup_date: "",
          pickup_time: "",
          address: "",
          special_instructions: "",
        });
      } else {
        toast.error(response.error || "Failed to create quick booking");
      }
    } catch (error) {
      console.error("Quick booking error:", error);
      toast.error("Failed to create quick booking");
    } finally {
      setLoading(false);
    }
  };

  // Generate dynamic time slots based on current time and selected date
  const generateTimeSlots = () => {
    const now = new Date();
    const selectedDate = new Date(formData.pickup_date);
    const isToday = selectedDate.toDateString() === now.toDateString();

    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 20; // 8 PM

    for (let hour = startHour; hour <= endHour; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;

      if (isToday) {
        // If selected date is today, check if time slot is at least 30 minutes from now
        const slotTime = new Date();
        slotTime.setHours(hour, 0, 0, 0);
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

        if (slotTime >= thirtyMinutesFromNow) {
          slots.push(timeString);
        }
      } else {
        // For future dates, all slots are available
        slots.push(timeString);
      }
    }

    return slots;
  };

  const availableTimeSlots = generateTimeSlots();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md max-w-[95vw] w-full mx-auto h-[85vh] flex flex-col p-0 overflow-hidden z-[50]"
        data-quick-book-modal
        style={{
          position: 'fixed',
          top: '7.5vh',
          left: '50%',
          transform: 'translateX(-50%)',
          maxHeight: '85vh',
          height: '85vh',
          zIndex: 50,
          marginBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))'
        }}
      >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5" />
            Quick Book Pickup
          </DialogTitle>
          <p className="text-purple-100 text-sm mt-1">
            {!currentUser ? "Please log in to continue" : "Schedule a pickup and our rider will assess your items"}
          </p>
        </DialogHeader>

        {!currentUser ? (
          <div className="flex-1 flex items-center justify-center px-6 py-8">
            <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Login Required</h3>
            <p className="text-gray-600 mb-6">Please log in to use the Quick Book feature</p>
            <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white">
              Close
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-xs text-gray-500">
                Debug: currentUser = {JSON.stringify(currentUser, null, 2)}
              </div>
            )}
          </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col" style={{ height: 'calc(100% - 80px)' }}>
            <div
              className="flex-1 overflow-y-scroll px-6 py-4 space-y-6"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                height: 'calc(100vh - 250px)',
                maxHeight: 'calc(90vh - 200px)',
                overflowY: 'scroll',
                touchAction: 'pan-y',
                scrollBehavior: 'smooth'
              }}
            >
            {/* User Info Display */}
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg">
                      {currentUser?.name || currentUser?.full_name || "User"}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="h-4 w-4" />
                      {currentUser?.phone || "No phone"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pickup Date */}
            <div className="space-y-2">
              <Label htmlFor="pickup_date" className="text-sm font-medium text-gray-700">
                📅 Pickup Date *
              </Label>
              <div className="relative">
                <Input
                  id="pickup_date"
                  type="date"
                  value={formData.pickup_date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={getMinSelectableDate()}
                  max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // 30 days from now
                  className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500 focus:ring-2 focus:ring-opacity-20 transition-all duration-200 bg-white"
                  style={{
                    colorScheme: 'light',
                    WebkitAppearance: 'none',
                  }}
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Select a date from today onwards (up to 30 days)
              </p>
            </div>

            {/* Pickup Time */}
            <div className="space-y-2">
              <Label htmlFor="pickup_time" className="text-sm font-medium text-gray-700">
                ⏰ Pickup Time *
              </Label>
              <div className="relative">
                <Select
                  value={formData.pickup_time}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pickup_time: value }))}
                  disabled={!formData.pickup_date || availableTimeSlots.length === 0}
                >
                  <SelectTrigger className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500 focus:ring-2 focus:ring-opacity-20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue placeholder={
                      !formData.pickup_date
                        ? "Select date first"
                        : availableTimeSlots.length === 0
                          ? "No slots available for today"
                          : "Select pickup time"
                    } />
                  </SelectTrigger>
                  <SelectContent
                    className="z-[999999] max-h-[200px] overflow-y-auto bg-white shadow-2xl border border-gray-200 rounded-lg"
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    avoidCollisions={true}
                    sticky="always"
                  >
                    <div className="p-2">
                      <div className="text-xs text-gray-500 px-2 py-1 border-b mb-1">
                        Available Time Slots
                      </div>
                      {availableTimeSlots.length === 0 ? (
                        <div className="px-2 py-4 text-center text-gray-500 text-sm">
                          No time slots available for this date.
                          <br />
                          <span className="text-xs">Try selecting tomorrow or later.</span>
                        </div>
                      ) : (
                        availableTimeSlots.map((time) => (
                          <SelectItem
                            key={time}
                            value={time}
                            className="cursor-pointer hover:bg-purple-50 focus:bg-purple-50 rounded-md transition-colors py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <Clock className="h-4 w-4 text-purple-600" />
                              </div>
                              <span className="font-medium text-gray-900">
                                {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-500">
                  {formData.pickup_date && availableTimeSlots.length > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {availableTimeSlots.length} slot{availableTimeSlots.length !== 1 ? 's' : ''} available
                    </span>
                  )}
                  {formData.pickup_date && availableTimeSlots.length === 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="h-3 w-3" />
                      No slots available today
                    </span>
                  )}
                </div>
                {formData.pickup_date && (
                  <div className="text-purple-600 font-medium">
                    {new Date(formData.pickup_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                📍 Pickup Address *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  onBlur={async (e) => {
                    if (e.target.value.trim()) {
                      await validatePickupAddress(e.target.value);
                    }
                  }}
                  placeholder="e.g., Sector 21, Gurugram 122001 or Block A, Noida 201301"
                  className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500 flex-1"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-12 border-gray-300 hover:border-purple-500 hover:bg-purple-50"
                  onClick={detectLocation}
                  disabled={detectingLocation}
                >
                  {detectingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  ) : (
                    <Navigation className="h-4 w-4 text-purple-600" />
                  )}
                </Button>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label htmlFor="special_instructions" className="text-sm font-medium text-gray-700">
                💬 Special Instructions (Optional)
              </Label>
              <Input
                id="special_instructions"
                value={formData.special_instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                placeholder="Any special instructions for our rider"
                className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            {/* Info Alert */}
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-800 leading-relaxed">
                🚚 <strong>How it works:</strong> Our professional rider will visit at your scheduled time to assess and collect your items. No need to specify what items - we handle everything!
              </AlertDescription>
            </Alert>
          </div>

          {/* Fixed bottom section for submit button */}
          <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50">
            <Button
              type="submit"
              onClick={(e) => {
                console.log("🔘 Submit button clicked directly!");
                console.log("📝 Loading state:", loading);
                console.log("🎯 Button disabled:", loading);
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Quick Book...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Confirm Quick Book
                </>
              )}
            </Button>
            </div>
          </form>
        )}
      </DialogContent>

      {/* Location Unavailable Modal with higher z-index */}
      <LocationUnavailableModal
        isOpen={showLocationUnavailable}
        onClose={() => setShowLocationUnavailable(false)}
        detectedLocation={detectedLocationText}
        onExplore={() => {
          // Close both modals and let user explore services
          setShowLocationUnavailable(false);
          onClose();
        }}
        onNavigateHome={() => {
          // Navigate to home to explore available services
          window.location.href = "/";
        }}
      />
    </Dialog>
  );
};

export default QuickBookModal;
