import { config, getApiUrl, shouldUseBackend } from "../config/env";

export interface DetectedLocationData {
  full_address: string;
  city: string;
  state?: string;
  country?: string;
  pincode?: string;
  house_number?: string;
  building_name?: string;
  street_name?: string;
  neighborhood?: string;
  landmark?: string;
  formatted_address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  detection_method: "gps" | "ip" | "manual" | "autocomplete" | "precise_gps";
  accuracy?: number;
  confidence_score?: number;
}

export interface LocationAvailabilityResponse {
  success: boolean;
  is_available: boolean;
  message?: string;
  error?: string;
}

export interface DetectedLocationResponse {
  success: boolean;
  data?: any;
  is_available?: boolean;
  error?: string;
}

export class LocationDetectionService {
  private static instance: LocationDetectionService;
  private apiBaseUrl: string;

  constructor() {
    // Use centralized API URL configuration
    this.apiBaseUrl = shouldUseBackend() ? getApiUrl() : null;
  }

  public static getInstance(): LocationDetectionService {
    if (!LocationDetectionService.instance) {
      LocationDetectionService.instance = new LocationDetectionService();
    }
    return LocationDetectionService.instance;
  }

  /**
   * Save detected location to backend
   */
  async saveDetectedLocation(
    locationData: DetectedLocationData,
  ): Promise<DetectedLocationResponse> {
    try {
      console.log("📍 Saving detected location:", locationData);

      if (!this.apiBaseUrl) {
        console.warn("⚠️ No API URL configured for location detection");
        return {
          success: false,
          error: "API not configured",
        };
      }

      const response = await fetch(`${this.apiBaseUrl}/detected-locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Location saved to backend:", result);

      return result;
    } catch (error) {
      console.error("❌ Failed to save detected location:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if location is available for service
   */
  async checkLocationAvailability(
    city: string,
    pincode?: string,
    fullAddress?: string,
    coordinates?: { lat: number; lng: number },
  ): Promise<LocationAvailabilityResponse> {
    try {
      // Validate that city is provided and not empty
      if (!city || city.trim() === "") {
        console.warn("⚠️ City is empty or undefined, using fallback value");
        city = "unknown";
      }

      // Always perform local check as primary method for consistency
      console.log("🔍 Checking location availability:", { city, pincode, fullAddress });

      if (!this.apiBaseUrl || !shouldUseBackend()) {
        // Use local check when backend is not available
        const localResult = this.checkAvailabilityLocal(city, pincode, coordinates, fullAddress);
        console.log("📍 Local availability check result:", localResult);
        return localResult;
      }

      const requestData = {
        city: city.trim(),
        pincode: pincode?.trim() || undefined,
        full_address: fullAddress?.trim() || undefined,
        coordinates: coordinates || undefined,
      };

      console.log("🌐 Backend request data:", requestData);

      const response = await fetch(
        `${this.apiBaseUrl}/detected-locations/check-availability`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        },
      );

      const responseText = await response.text();
      console.log("🌐 Backend response text:", responseText);

      if (!response.ok) {
        console.warn(`❌ Backend availability check failed (${response.status}): ${responseText}`);
        console.warn("Falling back to local check");
        const localResult = this.checkAvailabilityLocal(city, pincode, coordinates, fullAddress);
        console.log("📍 Fallback local availability check result:", localResult);
        return localResult;
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse backend response:", parseError);
        console.log("Falling back to local check");
        return this.checkAvailabilityLocal(city, pincode, coordinates, fullAddress);
      }

      console.log("✅ Backend availability check result:", result);
      return result;
    } catch (error) {
      console.error("❌ Failed to check availability:", error);
      // Fallback to local check
      return this.checkAvailabilityLocal(city, pincode, coordinates, fullAddress);
    }
  }

  /**
   * Check if coordinates are in Sector 69, Gurugram using bounding box
   */
  private isInSector69(lat: number, lng: number): boolean {
    // Bounding box for Sector 69, Gurugram
    const minLat = 28.3940;
    const maxLat = 28.3980;
    const minLng = 77.0350;
    const maxLng = 77.0390;

    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }

  /**
   * Local fallback for availability check
   */
  private checkAvailabilityLocal(
    city: string,
    pincode?: string,
    coordinates?: { lat: number; lng: number },
    fullAddress?: string,
  ): LocationAvailabilityResponse {
    const normalizedCity = city?.toLowerCase().trim();

    // Define available locations with keywords (matching backend logic)
    const availableLocations = [
      {
        city: "gurgaon",
        area: "sector 69",
        pincode: "122101",
        keywords: ["tulip", "sector 69", "sector-69", "sector 69 gurugram", "sector 69 gurgaon"]
      },
      {
        city: "gurugram",
        area: "sector 69",
        pincode: "122101",
        keywords: ["tulip", "sector 69", "sector-69", "dlf", "sector 69 gurugram", "sector 69 gurgaon"]
      }
    ];

    // Check pincode 122101 first - exact match
    if (pincode && pincode.trim() === "122101") {
      return {
        success: true,
        is_available: true,
        message: "Service available for pincode 122101",
      };
    }

    // Check keywords in full address before rejecting based on pincode
    if (fullAddress) {
      const addressLower = fullAddress.toLowerCase();

      const matchByKeyword = availableLocations.find(location =>
        location.keywords.some(keyword =>
          addressLower.includes(keyword.toLowerCase())
        )
      );

      if (matchByKeyword) {
        return {
          success: true,
          is_available: true,
          message: `Service available in your area (${matchByKeyword.area}, ${matchByKeyword.city})`,
        };
      }
    }

    // Check coordinates for Sector 69 if available (legacy support)
    if (coordinates && this.isInSector69(coordinates.lat, coordinates.lng)) {
      return {
        success: true,
        is_available: true,
        message: "Service available in Sector 69, Gurugram (GPS verified)",
      };
    }

    // Check by city name and area
    const isAvailableByCity = availableLocations.some(
      (location) =>
        normalizedCity?.includes(location.city) &&
        (normalizedCity?.includes("sector 69") ||
          normalizedCity?.includes("sector-69")),
    );

    if (isAvailableByCity) {
      return {
        success: true,
        is_available: true,
        message: "Service available in your area",
      };
    }

    // If no matches found
    const availableAreas = availableLocations
      .map(loc => `${loc.area}, ${loc.city} (${loc.pincode})`)
      .join("; ");

    return {
      success: true,
      is_available: false,
      message: `Service not available in your area. Currently serving: ${availableAreas}`,
    };
  }

  /**
   * Detect location using browser geolocation API
   */
  async detectLocationGPS(): Promise<DetectedLocationData | null> {
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation not supported");
      }

      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          });
        },
      );

      const { latitude, longitude } = position.coords;
      console.log("📍 GPS coordinates detected:", { latitude, longitude });

      // Try to get address from coordinates using reverse geocoding
      const addressData = await this.reverseGeocode(latitude, longitude);

      if (addressData) {
        return {
          ...addressData,
          coordinates: { lat: latitude, lng: longitude },
          detection_method: "gps",
        };
      }

      return {
        full_address: `Coordinates: ${latitude}, ${longitude}`,
        city: "Unknown",
        coordinates: { lat: latitude, lng: longitude },
        detection_method: "gps",
      };
    } catch (error) {
      console.error("❌ GPS detection failed:", error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address with enhanced house number detection
   */
  private async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<Omit<
    DetectedLocationData,
    "coordinates" | "detection_method"
  > | null> {
    try {
      // Try Google Maps Geocoding API if available (more accurate for house numbers)
      if ((window as any).google?.maps) {
        const geocoder = new (window as any).google.maps.Geocoder();
        const result = await new Promise((resolve, reject) => {
          geocoder.geocode(
            { location: { lat, lng } },
            (results: any, status: any) => {
              if (status === "OK" && results[0]) {
                resolve(results[0]);
              } else {
                reject(new Error("Geocoding failed"));
              }
            },
          );
        });

        return this.parseGoogleMapsResult(result);
      }

      // Enhanced Nominatim request for more detailed address info
      const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse');
      nominatimUrl.searchParams.set('lat', lat.toString());
      nominatimUrl.searchParams.set('lon', lng.toString());
      nominatimUrl.searchParams.set('format', 'json');
      nominatimUrl.searchParams.set('addressdetails', '1');
      nominatimUrl.searchParams.set('zoom', '18'); // Higher zoom for more detailed address

      const response = await fetch(nominatimUrl.toString());

      if (!response.ok) throw new Error("Nominatim request failed");

      const data = await response.json();

      // Enhanced address parsing to include house numbers and building names
      const addressComponents = [];
      const address = data.address || {};

      // Add house number if available
      if (address.house_number) {
        addressComponents.push(address.house_number);
      }

      // Add building or house name
      if (address.building || address.house) {
        addressComponents.push(address.building || address.house);
      }

      // Add road/street
      if (address.road) {
        addressComponents.push(address.road);
      }

      // Add neighborhood/suburb
      if (address.neighbourhood || address.suburb) {
        addressComponents.push(address.neighbourhood || address.suburb);
      }

      // Add sector or residential area
      if (address.residential) {
        addressComponents.push(address.residential);
      }

      // Add city/town
      const city = address.city || address.town || address.village || "Unknown";
      if (city !== "Unknown") {
        addressComponents.push(city);
      }

      // Add state
      if (address.state) {
        addressComponents.push(address.state);
      }

      // Add postal code
      if (address.postcode) {
        addressComponents.push(address.postcode);
      }

      const enhancedAddress = addressComponents.length > 0
        ? addressComponents.join(', ')
        : (data.display_name || "Unknown address");

      return {
        full_address: enhancedAddress,
        city: city,
        state: address.state || "",
        country: address.country || "India",
        pincode: address.postcode || "",
      };
    } catch (error) {
      console.error("❌ Reverse geocoding failed:", error);
      return null;
    }
  }

  /**
   * Parse Google Maps geocoding result with enhanced address component extraction
   */
  private parseGoogleMapsResult(
    result: any,
  ): Omit<DetectedLocationData, "coordinates" | "detection_method"> {
    const components = result.address_components || [];

    let houseNumber = "";
    let route = "";
    let neighborhood = "";
    let sublocality = "";
    let city = "";
    let state = "";
    let country = "";
    let pincode = "";

    components.forEach((component: any) => {
      const types = component.types || [];

      if (types.includes("street_number")) {
        houseNumber = component.long_name;
      } else if (types.includes("route")) {
        route = component.long_name;
      } else if (types.includes("neighborhood")) {
        neighborhood = component.long_name;
      } else if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
        sublocality = component.long_name;
      } else if (
        types.includes("locality") ||
        types.includes("administrative_area_level_2")
      ) {
        city = component.long_name;
      } else if (types.includes("administrative_area_level_1")) {
        state = component.long_name;
      } else if (types.includes("country")) {
        country = component.long_name;
      } else if (types.includes("postal_code")) {
        pincode = component.long_name;
      }
    });

    // Build enhanced address with house number and detailed components
    const addressParts = [];

    if (houseNumber) addressParts.push(houseNumber);
    if (route) addressParts.push(route);
    if (neighborhood) addressParts.push(neighborhood);
    if (sublocality) addressParts.push(sublocality);
    if (city) addressParts.push(city);
    if (state) addressParts.push(state);
    if (pincode) addressParts.push(pincode);

    const enhancedAddress = addressParts.length > 0
      ? addressParts.join(', ')
      : (result.formatted_address || "Unknown address");

    return {
      full_address: enhancedAddress,
      city: city || "Unknown",
      state,
      country: country || "India",
      pincode,
    };
  }
}
