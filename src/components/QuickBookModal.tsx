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

  useEffect(() => {
    if (isOpen) {
      // Set default pickup date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData(prev => ({
        ...prev,
        pickup_date: tomorrow.toISOString().split('T')[0],
      }));
    }
  }, [isOpen]);

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

  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

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
              <Input
                id="pickup_date"
                type="date"
                value={formData.pickup_date}
                onChange={(e) => setFormData(prev => ({ ...prev, pickup_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="h-12 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                required
              />
            </div>

            {/* Pickup Time */}
            <div className="space-y-2">
              <Label htmlFor="pickup_time" className="text-sm font-medium text-gray-700">
                ⏰ Pickup Time *
              </Label>
              <Select
                value={formData.pickup_time}
                onValueChange={(value) => setFormData(prev => ({ ...prev, pickup_time: value }))}
              >
                <SelectTrigger className="h-12 text-base border-gray-300 focus:border-purple-500">
                  <SelectValue placeholder="Select pickup time" />
                </SelectTrigger>
                <SelectContent
                  className="z-[9999] bg-white shadow-xl border border-gray-200"
                  style={{ zIndex: 9999 }}
                  position="popper"
                  sideOffset={4}
                  alignOffset={0}
                  container={document.body}
                >
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
