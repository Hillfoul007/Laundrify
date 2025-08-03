interface LocationData {
  latitude: number;
  longitude: number;
  fullAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  detectionMethod?: 'gps' | 'ip' | 'manual' | 'autocomplete';
}

interface UserLocationData extends LocationData {
  userId: string;
  phone: string;
  name: string;
  sessionId?: string;
}

export class LocationTrackingService {
  private static instance: LocationTrackingService;

  public static getInstance(): LocationTrackingService {
    if (!LocationTrackingService.instance) {
      LocationTrackingService.instance = new LocationTrackingService();
    }
    return LocationTrackingService.instance;
  }

  // Save anonymous user location when detected (without login)
  async saveAnonymousLocation(locationData: LocationData): Promise<boolean> {
    try {
      console.log('📍 Saving anonymous location:', locationData);
      
      const requestData = {
        full_address: locationData.fullAddress || `${locationData.latitude}, ${locationData.longitude}`,
        city: locationData.city || 'Unknown',
        state: locationData.state || '',
        country: locationData.country || 'India',
        pincode: locationData.pincode || '',
        coordinates: {
          lat: locationData.latitude,
          lng: locationData.longitude,
        },
        detection_method: locationData.detectionMethod || 'gps',
      };

      const response = await fetch('/api/detected-locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        let errorData = {};
        try {
          const responseText = await response.text();
          if (responseText.trim()) {
            errorData = JSON.parse(responseText);
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (parseError) {
          errorData = { error: `HTTP ${response.status}: Failed to parse error response` };
        }
        console.error('Failed to save anonymous location:', errorData);
        return false;
      }

      let result = {};
      try {
        const responseText = await response.text();
        if (responseText.trim()) {
          result = JSON.parse(responseText);
        } else {
          result = { success: true, message: 'Location saved successfully' };
        }
      } catch (parseError) {
        console.warn('Response was not JSON, but request succeeded');
        result = { success: true, message: 'Location saved successfully' };
      }

      console.log('✅ Anonymous location saved successfully:', result);
      return true;
    } catch (error) {
      console.error('Error saving anonymous location:', error);
      return false;
    }
  }

  // Save logged-in user location (after login)
  async saveLoggedInUserLocation(userLocationData: UserLocationData): Promise<boolean> {
    try {
      console.log('👤 Saving logged-in user location:', userLocationData);
      
      const requestData = {
        user_id: userLocationData.userId,
        phone: userLocationData.phone,
        name: userLocationData.name,
        full_address: userLocationData.fullAddress || `${userLocationData.latitude}, ${userLocationData.longitude}`,
        city: userLocationData.city || 'Unknown',
        state: userLocationData.state || '',
        country: userLocationData.country || 'India',
        pincode: userLocationData.pincode || '',
        coordinates: {
          lat: userLocationData.latitude,
          lng: userLocationData.longitude,
        },
        detection_method: userLocationData.detectionMethod || 'gps',
        session_id: userLocationData.sessionId || '',
      };

      const response = await fetch('/api/detected-locations/logged-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        let errorData = {};
        try {
          const responseText = await response.text();
          if (responseText.trim()) {
            errorData = JSON.parse(responseText);
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (parseError) {
          errorData = { error: `HTTP ${response.status}: Failed to parse error response` };
        }
        console.error('Failed to save logged-in user location:', errorData);
        return false;
      }

      let result = {};
      try {
        const responseText = await response.text();
        if (responseText.trim()) {
          result = JSON.parse(responseText);
        } else {
          result = { success: true, message: 'Location saved successfully' };
        }
      } catch (parseError) {
        console.warn('Response was not JSON, but request succeeded');
        result = { success: true, message: 'Location saved successfully' };
      }

      console.log('✅ Logged-in user location saved successfully:', result);
      return true;
    } catch (error) {
      console.error('Error saving logged-in user location:', error);
      return false;
    }
  }

  // Helper method to parse address information from a geocoded result
  parseAddressComponents(addressComponents: any[]): {
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  } {
    const addressInfo: any = {};

    addressComponents.forEach((component: any) => {
      const types = component.types;
      
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        addressInfo.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        addressInfo.state = component.long_name;
      } else if (types.includes('country')) {
        addressInfo.country = component.long_name;
      } else if (types.includes('postal_code')) {
        addressInfo.pincode = component.long_name;
      }
    });

    return addressInfo;
  }

  // Store location temporarily for later use when user logs in
  storeLocationForLater(locationData: LocationData): void {
    try {
      const locationInfo = {
        ...locationData,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('pending_location_data', JSON.stringify(locationInfo));
      console.log('📦 Location stored for later use:', locationInfo);
    } catch (error) {
      console.error('Error storing location for later:', error);
    }
  }

  // Get stored location data
  getStoredLocation(): LocationData | null {
    try {
      const storedData = localStorage.getItem('pending_location_data');
      if (storedData) {
        const locationData = JSON.parse(storedData);
        // Check if data is not too old (within 24 hours)
        const timestamp = new Date(locationData.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return locationData;
        } else {
          localStorage.removeItem('pending_location_data');
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting stored location:', error);
      return null;
    }
  }

  // Clear stored location data
  clearStoredLocation(): void {
    try {
      localStorage.removeItem('pending_location_data');
      console.log('🧹 Cleared stored location data');
    } catch (error) {
      console.error('Error clearing stored location:', error);
    }
  }
}
