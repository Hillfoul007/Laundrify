const express = require("express");
const mongoose = require("mongoose");
const QuickPickup = require("../models/QuickPickup");
const User = require("../models/User");

const router = express.Router();

// Create a new quick pickup
router.post("/", async (req, res) => {
  try {
    console.log("📝 Step 1: Quick pickup request received:", req.body);

    const {
      customer_id,
      customer_name,
      customer_phone,
      pickup_date,
      pickup_time,
      house_number,
      address,
      special_instructions,
    } = req.body;

    console.log("📝 Step 2: Request data extracted");

    // Validate required fields
    if (!customer_id || !customer_name || !customer_phone || !pickup_date || !pickup_time || !address) {
      console.log("❌ Step 3: Validation failed - missing required fields");
      return res.status(400).json({
        error: "Missing required fields: customer_id, customer_name, customer_phone, pickup_date, pickup_time, address",
      });
    }

    console.log("✅ Step 3: Validation passed");

    // Enhanced address validation for Quick Pickup
    const addressLower = address.toLowerCase();
    const validKeywords = ["tulip", "sector 69 gurugram", "sector 69 gurgaon"];
    const hasValidKeyword = validKeywords.some(keyword => addressLower.includes(keyword));
    const pincodeMatch = address.match(/\b122101\b/);
    const hasValidPincode = !!pincodeMatch;

    if (!hasValidKeyword && !hasValidPincode) {
      console.log("❌ Address validation failed: Service not available in this area");
      return res.status(400).json({
        error: "Service not available in your area. We currently serve areas with 'tulip', 'sector 69 gurugram', or pincode 122101.",
      });
    }

    console.log("✅ Address validation passed");

    // Check if database is connected
    const isDatabaseConnected = mongoose.connection.readyState === 1;
    console.log("📝 Step 4: Database connection status:", isDatabaseConnected ? "Connected" : "Disconnected");

    if (isDatabaseConnected) {
      console.log("📝 Step 5: Using database mode");

      // Validate customer exists (optional for quick pickups)
      console.log("📝 Step 6: Validating customer ID:", customer_id);
      let customerExists = false;
      if (mongoose.Types.ObjectId.isValid(customer_id)) {
        console.log("📝 Step 7: Customer ID is valid ObjectId, checking database...");
        try {
          const customer = await User.findById(customer_id);
          customerExists = !!customer;
          console.log("📝 Step 8: Customer lookup result:", customer ? "Found" : "Not Found");
          if (customer) {
            console.log("📝 Step 9: Customer details:", { name: customer.name, phone: customer.phone });
          } else {
            console.log("⚠️ Step 9: Customer not found, proceeding with quick pickup anyway");
          }
        } catch (customerError) {
          console.error("❌ Step 8: Error during customer lookup:", customerError);
          console.log("⚠️ Proceeding with quick pickup despite lookup error");
        }
      }

      console.log("📝 Step 10: Creating QuickPickup object...");
      // Create quick pickup
      const quickPickup = new QuickPickup({
        customer_id,
        customer_name,
        customer_phone,
        pickup_date,
        pickup_time,
        house_number: house_number || "",
        address,
        special_instructions: special_instructions || "",
        status: "pending",
      });

      console.log("📝 Step 11: Saving QuickPickup to database...");
      try {
        await quickPickup.save();
        console.log("✅ Step 12: QuickPickup saved successfully");
      } catch (saveError) {
        console.error("❌ Step 12: Error saving QuickPickup:", saveError);
        return res.status(500).json({ error: "Failed to save pickup", details: saveError.message });
      }

      console.log("📝 Step 13: Attempting to populate customer data...");
      try {
        if (customerExists) {
          await quickPickup.populate("customer_id", "name full_name phone email");
          console.log("✅ Step 14: Customer data populated successfully");
        }
      } catch (populateError) {
        console.warn("⚠️ Step 14: Could not populate customer data:", populateError);
      }

      console.log("📝 Step 15: Sending success response...");
      console.log("✅ Quick pickup created:", quickPickup._id);
      res.status(201).json({
        message: "Quick pickup created successfully",
        quickPickup,
      });
    } else {
      // Mock mode when database is not connected
      console.log("📝 Step 5: Using mock mode (database not connected)");
      const mockQuickPickup = {
        _id: "mock_" + Date.now(),
        customer_id,
        customer_name,
        customer_phone,
        pickup_date,
        pickup_time,
        address,
        special_instructions: special_instructions || "",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("📝 Step 6: Mock pickup object created:", mockQuickPickup._id);
      console.log("📝 Step 7: Sending response...");

      res.status(201).json({
        message: "Quick pickup created successfully (mock mode)",
        quickPickup: mockQuickPickup,
      });
    }
  } catch (error) {
    console.error("❌ Error creating quick pickup:", error);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.error("❌ Validation errors:", validationErrors);
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// Get quick pickups for a customer
router.get("/customer/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    console.log(`📋 Fetching quick pickups for customer: ${customerId}`);

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }

    const quickPickups = await QuickPickup.find({ customer_id: customerId })
      .populate("customer_id", "name full_name phone email")
      .populate("rider_id", "name phone")
      .sort({ createdAt: -1 });

    res.json({ quickPickups });
  } catch (error) {
    console.error("❌ Error fetching customer quick pickups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all quick pickups (for admin/riders)
router.get("/", async (req, res) => {
  try {
    const {
      status,
      rider_id,
      customer_id,
      pickup_date,
      limit = 50,
      offset = 0,
      sort = "-createdAt",
    } = req.query;

    console.log("📋 Fetching quick pickups with filters:", req.query);

    // Build query
    const query = {};
    if (status) query.status = status;
    if (rider_id && mongoose.Types.ObjectId.isValid(rider_id)) {
      query.rider_id = rider_id;
    }
    if (customer_id && mongoose.Types.ObjectId.isValid(customer_id)) {
      query.customer_id = customer_id;
    }
    if (pickup_date) query.pickup_date = pickup_date;

    // Parse sort parameter
    let sortObj = {};
    if (sort.startsWith("-")) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const quickPickups = await QuickPickup.find(query)
      .populate("customer_id", "name full_name phone email")
      .populate("rider_id", "name phone")
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const totalCount = await QuickPickup.countDocuments(query);

    res.json({
      quickPickups,
      totalCount,
      hasMore: parseInt(offset) + quickPickups.length < totalCount,
    });
  } catch (error) {
    console.error("❌ Error fetching quick pickups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update quick pickup status (for riders/admin)
router.put("/:quickPickupId", async (req, res) => {
  try {
    const { quickPickupId } = req.params;
    const updateData = req.body;

    console.log("📝 Updating quick pickup:", { quickPickupId, updateData });

    // Validate quickPickupId
    if (!mongoose.Types.ObjectId.isValid(quickPickupId)) {
      return res.status(400).json({ error: "Invalid quick pickup ID" });
    }

    // Handle status updates with timestamps
    if (updateData.status) {
      if (updateData.status === "completed") {
        updateData.completed_at = new Date();
      } else if (updateData.status === "cancelled") {
        updateData.cancelled_at = new Date();
      }
    }

    const quickPickup = await QuickPickup.findByIdAndUpdate(
      quickPickupId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("customer_id", "name full_name phone email")
      .populate("rider_id", "name phone");

    if (!quickPickup) {
      return res.status(404).json({ error: "Quick pickup not found" });
    }

    console.log("✅ Quick pickup updated:", quickPickup._id);
    res.json({
      message: "Quick pickup updated successfully",
      quickPickup,
    });
  } catch (error) {
    console.error("❌ Error updating quick pickup:", error);
    
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// Assign rider to quick pickup
router.put("/:quickPickupId/assign", async (req, res) => {
  try {
    const { quickPickupId } = req.params;
    const { rider_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(quickPickupId)) {
      return res.status(400).json({ error: "Invalid quick pickup ID" });
    }

    if (!rider_id || !mongoose.Types.ObjectId.isValid(rider_id)) {
      return res.status(400).json({ error: "Valid rider ID is required" });
    }

    const quickPickup = await QuickPickup.findByIdAndUpdate(
      quickPickupId,
      {
        rider_id,
        status: "assigned",
      },
      { new: true }
    )
      .populate("customer_id", "name full_name phone email")
      .populate("rider_id", "name phone");

    if (!quickPickup) {
      return res.status(404).json({ error: "Quick pickup not found" });
    }

    console.log("✅ Rider assigned to quick pickup:", quickPickup._id);
    res.json({
      message: "Rider assigned successfully",
      quickPickup,
    });
  } catch (error) {
    console.error("❌ Error assigning rider:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete quick pickup
router.delete("/:quickPickupId", async (req, res) => {
  try {
    const { quickPickupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quickPickupId)) {
      return res.status(400).json({ error: "Invalid quick pickup ID" });
    }

    const quickPickup = await QuickPickup.findByIdAndDelete(quickPickupId);

    if (!quickPickup) {
      return res.status(404).json({ error: "Quick pickup not found" });
    }

    console.log("✅ Quick pickup deleted:", quickPickupId);
    res.json({ message: "Quick pickup deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting quick pickup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get quick pickup statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await Promise.all([
      QuickPickup.countDocuments({ status: "pending" }),
      QuickPickup.countDocuments({ status: "assigned" }),
      QuickPickup.countDocuments({ status: "picked_up" }),
      QuickPickup.countDocuments({ status: "completed" }),
      QuickPickup.countDocuments(),
    ]);

    res.json({
      pending: stats[0],
      assigned: stats[1],
      picked_up: stats[2],
      completed: stats[3],
      total: stats[4],
    });
  } catch (error) {
    console.error("❌ Error fetching quick pickup stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
