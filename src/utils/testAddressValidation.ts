/**
 * Test utility to verify address validation for Quick Pickup and Cart
 * Tests the new keywords: "sector 69 gurugram" and "tulip"
 */

import { LocationDetectionService } from '../services/locationDetectionService';

export async function testAddressValidation() {
  const locationService = new LocationDetectionService();
  
  const testAddresses = [
    // Original working cases
    { address: "Tulip Violet, Sector 69, Gurgaon", description: "Original Tulip case" },
    { address: "122101", description: "Original pincode case" },
    { address: "Sector 69, Gurugram", description: "Original sector case" },
    
    // New cases that should now work
    { address: "Sector 69 Gurugram", description: "New sector 69 gurugram keyword" },
    { address: "Tulip Violet Sector 69 Gurugram", description: "Tulip + new keyword" },
    { address: "Near Tulip, Sector 69 Gurgaon", description: "Tulip + sector 69 gurgaon" },
    { address: "Sector 69 gurugram, near tulip", description: "Mixed case with tulip" },
    
    // Should still not work
    { address: "Sector 70, Gurugram", description: "Different sector (should fail)" },
    { address: "122102", description: "Different pincode (should fail)" },
  ];

  console.log("🧪 Testing Address Validation for Quick Pickup & Cart");
  console.log("=".repeat(50));

  for (const test of testAddresses) {
    try {
      // Extract components for testing
      const addressLower = test.address.toLowerCase();
      let city = "unknown";
      if (addressLower.includes("gurugram") || addressLower.includes("gurgaon")) {
        city = addressLower.includes("gurugram") ? "gurugram" : "gurgaon";
      }

      const pincodeMatch = test.address.match(/\b\d{6}\b/);
      const pincode = pincodeMatch ? pincodeMatch[0] : undefined;

      const result = await locationService.checkLocationAvailability(
        city,
        pincode,
        test.address
      );

      console.log(`${result.is_available ? "✅" : "❌"} ${test.description}`);
      console.log(`   Address: "${test.address}"`);
      console.log(`   Result: ${result.message}`);
      console.log("");
    } catch (error) {
      console.log(`❌ ${test.description} - Error: ${error}`);
    }
  }
}

// Export for use in development/testing
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testAddressValidation = testAddressValidation;
}
