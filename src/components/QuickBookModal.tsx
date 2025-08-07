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
  // Add mobile viewport fix on modal open
  React.useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Fix for iOS Safari viewport issues
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [formData, setFormData] = useState({
    pickup_date: "",
    pickup_time: "",
    address: "",
    special_instructions: "",
  });

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

  // Reset pickup time when date changes
  useEffect(() => {
    if (formData.pickup_date) {
      setFormData(prev => ({
        ...prev,
        pickup_time: "", // Reset time when date changes
      }));
    }
  }, [formData.pickup_date]);

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
      
      // Fallback to approximate address
      setFormData(prev => ({ 
        ...prev, 
        address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      }));
      toast.success("Location coordinates detected!");
    } catch (error) {
      console.error("Location detection failed:", error);
      toast.error("Failed to detect location. Please enter address manually.");
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pickup_date || !formData.pickup_time || !formData.address.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const quickBookData = {
        customer_id: currentUser._id,
        customer_name: currentUser.name || currentUser.full_name || "Quick Book User",
        customer_phone: currentUser.phone,
        pickup_date: formData.pickup_date,
        pickup_time: formData.pickup_time,
        address: formData.address,
        special_instructions: formData.special_instructions,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const response = await apiClient.request<any>("/quick-book", {
        method: "POST",
        body: quickBookData,
      });

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
        className="sm:max-w-md max-w-[95vw] w-full mx-auto h-[90vh] flex flex-col p-0 overflow-hidden z-[50]"
        style={{
          position: 'fixed',
          top: '5vh',
          left: '50%',
          transform: 'translateX(-50%)',
          maxHeight: '90vh',
          height: '90vh',
          zIndex: 50
        }}
      >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5" />
            Quick Book Pickup
          </DialogTitle>
          <p className="text-purple-100 text-sm mt-1">
            Schedule a pickup and our rider will assess your items
          </p>
        </DialogHeader>

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
                      {currentUser.name || currentUser.full_name || "User"}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="h-4 w-4" />
                      {currentUser.phone}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, pickup_date: e.target.value }))}
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
              <select
                id="pickup_time"
                value={formData.pickup_time}
                onChange={(e) => setFormData(prev => ({ ...prev, pickup_time: e.target.value }))}
                className="h-12 w-full text-base border border-gray-300 rounded-md px-3 py-2 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 outline-none transition-colors"
                required
              >
                <option value="" disabled>Select pickup time</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
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
                  placeholder="Enter your pickup address"
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
      </DialogContent>
    </Dialog>
  );
};

export default QuickBookModal;
