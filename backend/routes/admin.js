const express = require("express");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const User = require("../models/User");

const router = express.Router();

// Middleware to verify admin access (simple for now)
const verifyAdminAccess = (req, res, next) => {
  // In a production environment, you would implement proper admin authentication
  // For now, we'll use a simple header check or token validation
  const adminToken = req.headers["admin-token"] || req.headers["authorization"];
  
  // For demo purposes, we'll allow all requests
  // In production, implement proper admin authentication
  next();
};

// Get dashboard statistics
router.get("/stats", verifyAdminAccess, async (req, res) => {
  try {
    console.log("📊 Admin stats request received");

    // Get booking statistics
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const completedBookings = await Booking.countDocuments({ status: "completed" });
    const cancelledBookings = await Booking.countDocuments({ status: "cancelled" });

    // Get user statistics
    const totalUsers = await User.countDocuments({ user_type: "customer" });
    const activeUsers = await User.countDocuments({ 
      user_type: "customer",
      last_login: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    // Calculate revenue
    const revenueResult = await Booking.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$final_amount" } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Get recent bookings
    const recentBookings = await Booking.find()
      .populate("customer_id", "full_name phone")
      .sort({ created_at: -1 })
      .limit(10)
      .select("custom_order_id service status final_amount created_at customer_id");

    const stats = {
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      revenue: {
        total: totalRevenue,
      },
      recentBookings,
    };

    console.log("✅ Admin stats calculated:", stats);
    res.json({ success: true, stats });
  } catch (error) {
    console.error("❌ Error fetching admin stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Search users for admin booking
router.get("/users/search", verifyAdminAccess, async (req, res) => {
  try {
    const { q } = req.query;
    console.log("🔍 Admin user search:", q);

    if (!q || q.length < 3) {
      return res.json({ users: [] });
    }

    let query = {};

    // If query looks like a phone number
    if (q.match(/^\d+$/)) {
      query = { phone: { $regex: q, $options: "i" } };
    } else {
      // Search by name or email
      query = {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { full_name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      };
    }

    const users = await User.find(query)
      .select("name full_name phone email user_type")
      .limit(20);

    console.log(`✅ Found ${users.length} users matching "${q}"`);
    res.json({ users });
  } catch (error) {
    console.error("❌ Error searching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update booking (admin override)
router.put("/bookings/:bookingId", verifyAdminAccess, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updateData = req.body;

    console.log("📝 Admin booking update:", { bookingId, updateData });

    // Validate bookingId
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.created_at;
    delete updateData.customer_id;

    // Add admin update timestamp
    updateData.updated_at = new Date();
    updateData.updated_by_admin = true;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true, runValidators: true }
    ).populate("customer_id", "full_name phone email");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    console.log("✅ Booking updated by admin:", booking._id);
    res.json({ message: "Booking updated successfully", booking });
  } catch (error) {
    console.error("❌ Error updating booking:", error);
    
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all bookings with enhanced admin features
router.get("/bookings", verifyAdminAccess, async (req, res) => {
  try {
    const {
      status,
      customer_id,
      limit = 100,
      offset = 0,
      start_date,
      end_date,
      search,
    } = req.query;

    console.log("📋 Admin bookings request:", req.query);

    let query = {};

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Customer filter
    if (customer_id) {
      query.customer_id = customer_id;
    }

    // Date range filter
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    // Search filter
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { custom_order_id: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
        { service: searchRegex },
        { address: searchRegex },
      ];
    }

    const bookings = await Booking.find(query)
      .populate("customer_id", "full_name phone email")
      .populate("rider_id", "full_name phone")
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select("+item_prices +charges_breakdown");

    const total = await Booking.countDocuments(query);

    console.log(`✅ Admin fetched ${bookings.length} bookings (${total} total)`);

    res.json({
      bookings,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching admin bookings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get booking details for admin
router.get("/bookings/:bookingId", verifyAdminAccess, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const booking = await Booking.findById(bookingId)
      .populate("customer_id", "full_name phone email user_type created_at")
      .populate("rider_id", "full_name phone")
      .select("+item_prices +charges_breakdown");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    console.log("✅ Admin fetched booking details:", booking._id);
    res.json({ booking });
  } catch (error) {
    console.error("❌ Error fetching booking details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create booking on behalf of user
router.post("/bookings", verifyAdminAccess, async (req, res) => {
  try {
    console.log("📝 Admin creating booking for user:", req.body);

    // Add admin creation flag
    const bookingData = {
      ...req.body,
      created_by_admin: true,
      admin_notes: req.body.admin_notes || "Created by admin",
    };

    // Use the existing booking creation endpoint logic
    const booking = new Booking(bookingData);
    await booking.save();

    // Populate customer data
    await booking.populate("customer_id", "full_name phone email");

    console.log("✅ Admin created booking:", booking._id);
    res.status(201).json({
      message: "Booking created successfully by admin",
      booking,
    });
  } catch (error) {
    console.error("❌ Error creating admin booking:", error);
    
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user details for admin
router.get("/users/:userId", verifyAdminAccess, async (req, res) => {
  try {
    const { userId } = req.params;

    // Handle both ObjectId and phone-based lookups
    let user;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    } else if (userId.startsWith("user_")) {
      const phone = userId.replace("user_", "");
      user = await User.findOne({ phone });
    } else {
      user = await User.findOne({ phone: userId });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's booking history
    const bookings = await Booking.find({ customer_id: user._id })
      .sort({ created_at: -1 })
      .limit(10)
      .select("custom_order_id service status final_amount created_at");

    console.log("✅ Admin fetched user details:", user._id);
    res.json({ 
      user: {
        ...user.toObject(),
        password: undefined, // Never expose password
      },
      bookings 
    });
  } catch (error) {
    console.error("❌ Error fetching user details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user details (admin)
router.put("/users/:userId", verifyAdminAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Remove sensitive fields
    delete updateData.password;
    delete updateData._id;
    delete updateData.created_at;

    updateData.updated_at = new Date();

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Admin updated user:", user._id);
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete/Cancel booking (admin)
router.delete("/bookings/:bookingId", verifyAdminAccess, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { 
        status: "cancelled",
        updated_at: new Date(),
        cancelled_by_admin: true,
        admin_notes: req.body.reason || "Cancelled by admin"
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    console.log("✅ Admin cancelled booking:", booking._id);
    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    console.error("❌ Error cancelling booking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
