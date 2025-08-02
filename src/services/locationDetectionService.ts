import { config } from "../config/env";

export interface DetectedLocationData {
  full_address: string;
  city: string;
  state?: string;
  country?: string;
  pincode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  detection_method: "gps" | "ip" | "manual" | "autocomplete";
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
    // Use relative path for proxy compatibility in development
    this.apiBaseUrl = config.isProduction ? config.apiBaseUrl : "/api";
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
      // Always perform local check as primary method for consistency
      console.log("🔍 Checking location availability:", { city, pincode, fullAddress });

      if (!this.apiBaseUrl || this.apiBaseUrl === "" || config.isProduction) {
        // Use local check for consistency across all environments
        const localResult = this.checkAvailabilityLocal(city, pincode, coordinates);
        console.log("📍 Local availability check result:", localResult);
        return localResult;
      }

      const response = await fetch(
        `${this.apiBaseUrl}/detected-locations/check-availability`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            city,
            pincode,
            full_address: fullAddress,
            coordinates,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("❌ Failed to check availability:", error);
      // Fallback to local check
      return this.checkAvailabilityLocal(city, pincode, coordinates);
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
  ): LocationAvailabilityResponse {
    const normalizedCity = city?.toLowerCase().trim();

    // Check pincode 122101 first - this is the only allowed pincode
    if (pincode && pincode.trim() === "122101") {
      return {
        success: true,
        is_available: true,
        message: "Service available for pincode 122101",
      };
    }

    // Check coordinates for Sector 69 if available (legacy support)
    if (coordinates && this.isInSector69(coordinates.lat, coordinates.lng)) {
      return {
        success: true,
        is_available: true,
        message: "Service available in Sector 69, Gurugram (GPS verified)",
      };
    }

    // Available locations for city name checks
    const availableLocations = [
      { city: "gurgaon", area: "sector 69", pincode: "122101" },
      { city: "gurugram", area: "sector 69", pincode: "122101" },
      { city: "gurgaon", area: "sector-69", pincode: "122101" },
      { city: "gurugram", area: "sector-69", pincode: "122101" },
    ];

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

    // If pincode is provided but not 122101, service not available
    if (pincode && pincode.trim() !== "122101") {
      return {
        success: true,
        is_available: false,
        message: `Service currently not available for pincode ${pincode}. Available only for pincode 122101.`,
      };
    }

    return {
      success: true,
      is_available: false,
      message: "Service not available in your area. Currently serving pincode 122101 only.",
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
   * Reverse geocode coordinates to address
   */
  private async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<Omit<
    DetectedLocationData,
    "coordinates" | "detection_method"
  > | null> {
    try {
      // Try Google Maps Geocoding API if available
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

      // Fallback to a free geocoding service (example with Nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      );

      if (!response.ok) throw new Error("Nominatim request failed");

      const data = await response.json();

      return {
        full_address: data.display_name || "Unknown address",
        city:
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          "Unknown",
        state: data.address?.state || "",
        country: data.address?.country || "India",
        pincode: data.address?.postcode || "",
      };
    } catch (error) {
      console.error("❌ Reverse geocoding failed:", error);
      return null;
    }
  }

  /**
   * Parse Google Maps geocoding result
   */
  private parseGoogleMapsResult(
    result: any,
  ): Omit<DetectedLocationData, "coordinates" | "detection_method"> {
    const components = result.address_components || [];

    let city = "";
    let state = "";
    let country = "";
    let pincode = "";

    components.forEach((component: any) => {
      const types = component.types || [];

      if (
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

    return {
      full_address: result.formatted_address || "Unknown address",
      city: city || "Unknown",
      state,
      country: country || "India",
      pincode,
    };
  }
}
