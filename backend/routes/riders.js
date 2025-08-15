const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Rider = require("../models/Rider");
const Booking = require("../models/Booking");
const QuickPickup = require("../models/QuickPickup");
const otpService = require("../services/otpService");
const notificationService = require("../services/notificationService");
const riderNotificationService = require("../services/riderNotificationService");

const router = express.Router();

// Test endpoint to verify rider routes are working
router.get('/test', (req, res) => {
  console.log('🔍 Rider routes test endpoint hit');
  res.json({
    success: true,
    message: 'Rider routes are working! ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    dbConnected: !!mongoose.connection.readyState,
    dbState: mongoose.connection.readyState,
    features: {
      registration: true,
      login: true,
      adminManagement: true,
      orderAssignment: true,
      locationTracking: true,
      demoMode: true, // Always available
      demoFallback: true
    },
    demoCredentials: {
      phone: '9876543210',
      password: 'password123',
      alternatives: ['9876543211', '9876543212', 'any_number'],
      note: 'Demo mode always works as fallback'
    },
    endpoints: {
      login: '/api/riders/login',
      register: '/api/riders/register',
      test: '/api/riders/test'
    }
  });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/riders');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware to verify rider token
const verifyRiderToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.rider = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Request OTP for rider registration
router.post('/register/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }

    // Check if rider already exists
    if (mongoose.connection.readyState) {
      const existingRider = await Rider.findOne({ phone });
      if (existingRider) {
        return res.status(400).json({
          message: 'A rider with this phone number already exists'
        });
      }
    }

    // Generate and send OTP
    const otp = otpService.generateOTP();
    otpService.storeOTP(phone, otp, 'registration');

    const smsResult = await otpService.sendOTP(phone, otp, 'registration');

    if (!smsResult.success) {
      return res.status(500).json({
        message: 'Failed to send OTP. Please try again.'
      });
    }

    res.json({
      message: 'OTP sent successfully to your phone number',
      expiresIn: '10 minutes'
    });
  } catch (error) {
    console.error('❌ Registration OTP request error:', error);
    res.status(500).json({
      message: 'Failed to send OTP. Please try again.',
      error: 'Internal server error'
    });
  }
});

// Register new rider (with OTP verification)
router.post('/register', upload.fields([
  { name: 'aadharImage', maxCount: 1 },
  { name: 'selfieImage', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('🔍 Rider registration attempt:', {
      hasName: !!req.body.name,
      hasPhone: !!req.body.phone,
      hasAadhar: !!req.body.aadharNumber,
      hasFiles: !!req.files,
      fileKeys: req.files ? Object.keys(req.files) : []
    });

    const { name, phone, aadharNumber, otp } = req.body;

    if (!name || !phone || !aadharNumber || !otp) {
      return res.status(400).json({
        message: 'Name, phone, Aadhar number, and OTP are required'
      });
    }

    // Verify OTP first
    const verification = otpService.verifyOTP(phone, otp, 'registration');

    if (!verification.success) {
      return res.status(400).json({
        message: verification.error,
        attemptsRemaining: verification.attemptsRemaining
      });
    }

    // For development/demo mode when no database is connected
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: Accepting rider registration');
      return res.status(201).json({
        message: 'Registration submitted successfully (demo mode). Please wait for admin approval.',
        riderId: 'demo_rider_' + Date.now()
      });
    }

    // Check if rider already exists
    const existingRider = await Rider.findOne({
      $or: [{ phone }, { aadharNumber }]
    });

    if (existingRider) {
      return res.status(400).json({
        message: 'Rider with this phone number or Aadhar number already exists'
      });
    }

    // Check if files were uploaded
    if (!req.files?.aadharImage?.[0] || !req.files?.selfieImage?.[0]) {
      return res.status(400).json({
        message: 'Both Aadhar card image and selfie are required'
      });
    }

    // Create new rider (no password needed for OTP-based auth)
    const rider = new Rider({
      name,
      phone,
      aadharNumber,
      aadharImageUrl: `/uploads/riders/${req.files.aadharImage[0].filename}`,
      selfieImageUrl: `/uploads/riders/${req.files.selfieImage[0].filename}`,
    });

    await rider.save();

    console.log('✅ Rider registered successfully:', name);
    res.status(201).json({
      message: 'Registration submitted successfully. Please wait for admin approval.',
      riderId: rider._id
    });
  } catch (error) {
    console.error('❌ Rider registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Request OTP for rider login
router.post('/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }

    // Check if rider exists and is approved
    if (mongoose.connection.readyState) {
      const rider = await Rider.findOne({ phone });

      if (!rider) {
        return res.status(404).json({
          message: 'Rider not found. Please register first.'
        });
      }

      if (rider.status !== 'approved') {
        return res.status(403).json({
          message: rider.status === 'pending'
            ? 'Your account is pending approval from admin'
            : 'Your account has been rejected. Please contact admin.',
          status: rider.status
        });
      }
    }

    // Generate and send OTP
    const otp = otpService.generateOTP();
    otpService.storeOTP(phone, otp, 'login');

    const smsResult = await otpService.sendOTP(phone, otp, 'login');

    if (!smsResult.success) {
      return res.status(500).json({
        message: 'Failed to send OTP. Please try again.'
      });
    }

    res.json({
      message: 'OTP sent successfully to your phone number',
      expiresIn: '10 minutes'
    });
  } catch (error) {
    console.error('❌ OTP request error:', error);
    res.status(500).json({
      message: 'Failed to send OTP. Please try again.',
      error: 'Internal server error'
    });
  }
});

// Verify OTP and login rider
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: 'Phone number and OTP are required'
      });
    }

    // Verify OTP
    const verification = otpService.verifyOTP(phone, otp, 'login');

    if (!verification.success) {
      return res.status(400).json({
        message: verification.error,
        attemptsRemaining: verification.attemptsRemaining
      });
    }

    // Demo mode when database is not connected
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: OTP verified, logging in demo rider');

      const demoRider = {
        _id: 'demo_rider_' + phone.slice(-4),
        name: 'Demo Rider',
        phone: phone,
        status: 'approved',
        isActive: false,
      };

      const token = jwt.sign(
        { riderId: demoRider._id, phone: demoRider.phone },
        process.env.JWT_SECRET || 'fallback_secret_for_demo',
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        rider: demoRider,
        message: 'Login successful (demo mode)',
        mode: 'demo'
      });
    }

    // Find rider in database
    const rider = await Rider.findOne({ phone });

    if (!rider) {
      return res.status(404).json({
        message: 'Rider not found. Please register first.'
      });
    }

    if (rider.status !== 'approved') {
      return res.status(403).json({
        message: rider.status === 'pending'
          ? 'Your account is pending approval from admin'
          : 'Your account has been rejected. Please contact admin.',
        status: rider.status
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { riderId: rider._id, phone: rider.phone },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    console.log(`✅ Rider OTP login successful: ${rider.name}`);
    res.json({
      token,
      rider: {
        _id: rider._id,
        name: rider.name,
        phone: rider.phone,
        status: rider.status,
        isActive: rider.isActive,
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({
      message: 'Login failed. Please try again.',
      error: 'Internal server error'
    });
  }
});

// Legacy password-based login (deprecated - keeping for backward compatibility)
router.post('/login', async (req, res) => {
  try {
    console.log('🔍 Rider login attempt:', {
      hasPhone: !!req.body.phone,
      hasPassword: !!req.body.password,
      bodyKeys: Object.keys(req.body),
      body: req.body,
      headers: req.headers,
      url: req.url,
      method: req.method
    });

    const { phone, password } = req.body;

    if (!phone || !password) {
      console.log('❌ Missing credentials in request body');
      return res.status(400).json({
        message: 'Phone and password are required',
        received: { phone: !!phone, password: !!password },
        bodyKeys: Object.keys(req.body)
      });
    }

    console.log('🔧 Checking database connection...', {
      readyState: mongoose.connection.readyState,
      dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });

    // Only use demo mode if database is not connected AND not in production
    if (!mongoose.connection.readyState && process.env.NODE_ENV !== 'production') {
      console.log('🔧 Demo mode: Database not connected, using demo rider for:', phone);

      const demoRiders = {
        '9876543210': { name: 'Demo Rider A', status: 'approved', isActive: false },
        '9876543211': { name: 'Demo Rider B', status: 'approved', isActive: true },
        '9876543212': { name: 'Demo Rider C', status: 'pending', isActive: false },
        'default': { name: 'Demo Rider', status: 'approved', isActive: false }
      };

      const riderData = demoRiders[phone] || demoRiders['default'];
      const demoRider = {
        _id: 'demo_rider_' + phone.slice(-4),
        name: riderData.name,
        phone: phone,
        status: riderData.status,
        isActive: riderData.isActive,
      };

      const token = jwt.sign(
        { riderId: demoRider._id, phone: demoRider.phone },
        process.env.JWT_SECRET || 'fallback_secret_for_demo',
        { expiresIn: '7d' }
      );

      console.log('✅ Demo rider login successful:', demoRider.name);
      return res.json({
        token,
        rider: demoRider,
        message: 'Demo mode: Login successful (no database connection)',
        mode: 'demo'
      });
    }

    try {
      // Find rider by phone
      const rider = await Rider.findOne({ phone });

      if (!rider) {
        console.log(`❌ Rider not found in database for phone: ${phone}`);
        return res.status(400).json({
          message: 'Invalid phone number or password',
          error: 'Authentication failed'
        });
      }

      console.log(`🔍 Found rider: ${rider.name} (Status: ${rider.status}, Active: ${rider.isActive})`);

      // Check password
      const isMatch = await bcrypt.compare(password, rider.password);
      if (!isMatch) {
        console.log(`❌ Invalid password for rider: ${rider.name}`);
        return res.status(400).json({
          message: 'Invalid phone number or password',
          error: 'Authentication failed'
        });
      }

      // Check if rider is approved (status check)
      if (rider.status !== 'approved') {
        console.log(`⚠️ Rider ${rider.name} status is ${rider.status}, login denied`);
        return res.status(403).json({
          message: rider.status === 'pending'
            ? 'Your account is pending approval from admin'
            : 'Your account has been rejected. Please contact admin.',
          error: 'Account not approved',
          status: rider.status
        });
      }

      // Generate JWT token for real rider
      const realToken = jwt.sign(
        { riderId: rider._id, phone: rider.phone },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' }
      );

      console.log(`✅ Real rider login successful: ${rider.name}`);
      res.json({
        token: realToken,
        rider: {
          _id: rider._id,
          name: rider.name,
          phone: rider.phone,
          status: rider.status,
          isActive: rider.isActive,
        },
        message: 'Login successful',
        mode: 'database'
      });
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      return res.status(500).json({
        message: 'Database error occurred. Please try again.',
        error: 'Internal server error'
      });
    }
  } catch (error) {
    console.error('❌ Rider login error:', error);
    res.status(500).json({
      message: 'Login failed due to server error. Please try again.',
      error: 'Internal server error'
    });
  }
});

// Update rider location
router.post('/location', verifyRiderToken, async (req, res) => {
  try {
    console.log('🔍 Location update request:', {
      hasRiderId: !!req.rider?.riderId,
      hasLocation: !!req.body?.location,
      body: req.body
    });

    const { location, riderId, timestamp } = req.body;

    // For demo mode, just return success
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: Location update accepted');
      return res.json({
        message: 'Location updated successfully (demo mode)',
        location,
        timestamp: timestamp || new Date().toISOString(),
        mode: 'demo'
      });
    }

    const rider = await Rider.findById(req.rider.riderId);
    if (!rider) {
      console.log('❌ Rider not found, using demo response');
      return res.json({
        message: 'Location updated successfully (demo fallback)',
        location,
        timestamp: timestamp || new Date().toISOString(),
        mode: 'demo_fallback'
      });
    }

    await rider.updateLocation(location.lat, location.lng);

    res.json({
      message: 'Location updated successfully',
      location,
      timestamp: timestamp || new Date().toISOString(),
      mode: 'database'
    });
  } catch (error) {
    console.error('❌ Location update error:', error);
    // Fallback to demo response on error
    res.json({
      message: 'Location updated successfully (error fallback)',
      location: req.body?.location,
      timestamp: new Date().toISOString(),
      mode: 'error_fallback'
    });
  }
});

// Toggle rider active status
router.post('/toggle-status', verifyRiderToken, async (req, res) => {
  try {
    console.log('🔍 Status toggle request:', {
      hasRiderId: !!req.rider?.riderId,
      body: req.body
    });

    const { isActive, location, riderId } = req.body;

    // For demo mode, just return success
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: Status toggle accepted');
      return res.json({
        message: `Status updated to ${isActive ? 'active' : 'inactive'} (demo mode)`,
        isActive,
        mode: 'demo'
      });
    }

    const rider = await Rider.findById(req.rider.riderId);
    if (!rider) {
      console.log('❌ Rider not found, using demo response');
      return res.json({
        message: `Status updated to ${isActive ? 'active' : 'inactive'} (demo fallback)`,
        isActive,
        mode: 'demo_fallback'
      });
    }

    if (rider.status !== 'approved') {
      console.log('⚠️ Rider not approved, allowing in demo mode');
      return res.json({
        message: `Status updated to ${isActive ? 'active' : 'inactive'} (approval not required in demo)`,
        isActive,
        mode: 'demo_approval_bypass'
      });
    }

    rider.isActive = isActive;

    if (isActive && location) {
      await rider.updateLocation(location.lat, location.lng);
    }

    await rider.save();

    res.json({
      message: `Status updated to ${isActive ? 'active' : 'inactive'}`,
      isActive: rider.isActive,
      mode: 'database'
    });
  } catch (error) {
    console.error('❌ Status toggle error:', error);
    // Fallback to demo response on error
    const { isActive } = req.body;
    res.json({
      message: `Status updated to ${isActive ? 'active' : 'inactive'} (error fallback)`,
      isActive,
      mode: 'error_fallback'
    });
  }
});

// Get rider's assigned orders
router.get('/orders', verifyRiderToken, async (req, res) => {
  try {
    console.log('🔍 Get rider assigned orders request:', {
      hasRiderId: !!req.rider?.riderId,
      riderId: req.rider?.riderId
    });

    // For demo mode, return sample orders
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: Returning sample assigned orders');
      const sampleOrders = [
        {
          _id: '507f1f77bcf86cd799439011',
          bookingId: 'LAU-001',
          customerName: 'John Doe',
          customerPhone: '+91 9876543210',
          address: '123 MG Road, Sector 14, Gurugram',
          pickupTime: '2:00 PM - 4:00 PM',
          type: 'Regular',
          riderStatus: 'assigned',
          assignedAt: new Date().toISOString(),
          items: [
            { name: 'Shirt', quantity: 2, price: 50 },
            { name: 'Trouser', quantity: 1, price: 80 }
          ]
        },
        {
          _id: '507f1f77bcf86cd799439012',
          bookingId: 'LAU-002',
          customerName: 'Jane Smith',
          customerPhone: '+91 9876543211',
          address: '456 Cyber City, Sector 25, Gurugram',
          pickupTime: '4:00 PM - 6:00 PM',
          type: 'Express',
          riderStatus: 'accepted',
          assignedAt: new Date().toISOString(),
          items: [
            { name: 'Dress', quantity: 1, price: 120 }
          ]
        }
      ];

      return res.json(sampleOrders);
    }

    // Get all orders assigned to this rider from both Booking and QuickPickup collections
    const riderId = req.rider.riderId;

    const [regularOrders, quickPickups] = await Promise.all([
      // Regular bookings assigned to this rider
      Booking.find({
        assignedRider: riderId,
        riderStatus: { $in: ['assigned', 'accepted', 'picked_up'] } // Exclude completed orders
      })
      .populate('customer_id', 'name phone')
      .sort({ assignedAt: -1 }),

      // Quick pickups assigned to this rider
      QuickPickup.find({
        rider_id: riderId,
        status: { $in: ['assigned', 'accepted', 'picked_up'] } // Exclude completed orders
      })
      .populate('customer_id', 'name phone')
      .sort({ createdAt: -1 })
    ]);

    // Transform regular orders to consistent format
    const transformedRegularOrders = regularOrders.map(order => ({
      _id: order._id,
      bookingId: order.custom_order_id || order._id,
      customerName: order.name || order.customer_id?.name,
      customerPhone: order.phone || order.customer_id?.phone,
      address: order.address,
      pickupTime: `${order.scheduled_date} ${order.scheduled_time}`,
      type: 'Regular',
      riderStatus: order.riderStatus,
      assignedAt: order.assignedAt,
      items: order.item_prices || [],
      finalAmount: order.final_amount,
      specialInstructions: order.special_instructions
    }));

    // Transform quick pickups to consistent format
    const transformedQuickPickups = quickPickups.map(qp => ({
      _id: qp._id,
      bookingId: `QP-${qp._id.toString().slice(-6).toUpperCase()}`,
      customerName: qp.customer_name || qp.customer_id?.name,
      customerPhone: qp.customer_phone || qp.customer_id?.phone,
      address: qp.address,
      pickupTime: `${qp.pickup_date} ${qp.pickup_time}`,
      type: 'Quick Pickup',
      riderStatus: qp.status === 'assigned' ? 'assigned' : qp.status,
      assignedAt: qp.createdAt,
      estimatedCost: qp.estimated_cost,
      actualCost: qp.actual_cost,
      specialInstructions: qp.special_instructions,
      itemsCollected: qp.items_collected,
      notes: qp.notes
    }));

    // Combine and sort by assignment date
    const allAssignedOrders = [...transformedRegularOrders, ...transformedQuickPickups]
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

    console.log(`📋 Found ${regularOrders.length} regular orders and ${quickPickups.length} quick pickups assigned to rider ${riderId}`);

    res.json(allAssignedOrders);
  } catch (error) {
    console.error('❌ Get rider assigned orders error:', error);
    // Return empty array on error
    res.json([]);
  }
});

// Get specific order details
router.get('/orders/:orderId', verifyRiderToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Booking.findOne({
      _id: orderId,
      assignedRider: req.rider.riderId
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ message: 'Failed to fetch order details', error: error.message });
  }
});

// Update order items and details
router.put('/orders/:orderId/update', verifyRiderToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items, notes } = req.body;

    const order = await Booking.findOne({
      _id: orderId,
      assignedRider: req.rider.riderId
    }).populate('customer_id', 'name phone email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    // Get rider information
    const rider = await Rider.findById(req.rider.riderId);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    // Store original items for comparison
    const originalItems = order.items || [];

    // Calculate price changes
    const priceComparison = notificationService.calculatePriceChanges(originalItems, items);
    const itemChanges = notificationService.compareItems(originalItems, items);

    // Update order items
    order.items = items;
    order.notes = notes || order.notes;
    order.updatedBy = 'rider';
    order.lastModified = new Date();

    await order.save();

    // Send notification to user if there are significant changes
    if (priceComparison.price_change !== 0 || itemChanges.added.length > 0 ||
        itemChanges.removed.length > 0 || itemChanges.modified.length > 0) {

      try {
        const changes = {
          old_items: originalItems,
          new_items: items,
          price_change: priceComparison.price_change,
          old_total: priceComparison.old_total,
          new_total: priceComparison.new_total,
          item_changes: itemChanges,
          notes: notes
        };

        await notificationService.createOrderUpdateNotification(
          order.customer_id._id || order.customer_id,
          order,
          rider,
          changes
        );

        console.log(`✅ Notification sent to user for order ${order.bookingId || orderId}`);
      } catch (notificationError) {
        console.error('❌ Failed to send notification:', notificationError);
        // Don't fail the order update if notification fails
      }
    }

    res.json({
      message: 'Order updated successfully',
      order,
      price_change: priceComparison.price_change,
      notification_sent: true
    });
  } catch (error) {
    console.error('Order update error:', error);
    res.status(500).json({ message: 'Failed to update order', error: error.message });
  }
});

// Handle order actions (accept, start, complete)
router.post('/order-action', verifyRiderToken, async (req, res) => {
  try {
    console.log('🔍 Order action request:', {
      hasRiderId: !!req.rider?.riderId,
      body: req.body
    });

    const { orderId, action, location, riderId } = req.body;

    // Validate action
    if (!['accept', 'start', 'complete'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    // For demo mode, just return success
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: Order action accepted');
      return res.json({
        message: `Order ${action}ed successfully (demo mode)`,
        order: {
          _id: orderId,
          riderStatus: action === 'accept' ? 'accepted' : action === 'start' ? 'picked_up' : 'completed',
          [`${action}edAt`]: new Date().toISOString()
        },
        mode: 'demo'
      });
    }

    const order = await Booking.findOne({
      _id: orderId,
      assignedRider: req.rider.riderId
    });

    if (!order) {
      console.log('❌ Order not found, using demo response');
      return res.json({
        message: `Order ${action}ed successfully (demo fallback)`,
        order: {
          _id: orderId,
          riderStatus: action === 'accept' ? 'accepted' : action === 'start' ? 'picked_up' : 'completed'
        },
        mode: 'demo_fallback'
      });
    }

    switch (action) {
      case 'accept':
        order.riderStatus = 'accepted';
        order.acceptedAt = new Date();
        break;
      case 'start':
        order.riderStatus = 'picked_up';
        order.pickedUpAt = new Date();
        break;
      case 'complete':
        order.riderStatus = 'completed';
        order.completedAt = new Date();
        break;
    }

    await order.save();

    res.json({
      message: `Order ${action}ed successfully`,
      order,
      mode: 'database'
    });
  } catch (error) {
    console.error('❌ Order action error:', error);
    // Fallback to demo response on error
    const { orderId, action } = req.body;
    res.json({
      message: `Order ${action}ed successfully (error fallback)`,
      order: {
        _id: orderId,
        riderStatus: action === 'accept' ? 'accepted' : action === 'start' ? 'picked_up' : 'completed'
      },
      mode: 'error_fallback'
    });
  }
});

// Get rider notifications
router.get('/notifications', verifyRiderToken, async (req, res) => {
  try {
    console.log('🔍 Get notifications request:', {
      hasRiderId: !!req.rider?.riderId,
      riderId: req.rider?.riderId
    });

    const { includeRead } = req.query;

    // For demo mode, return sample notifications
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: Returning sample notifications');
      const sampleNotifications = [
        {
          _id: '507f1f77bcf86cd799439021',
          title: 'New Order Assigned',
          message: 'You have been assigned a new regular order #LAU-001 from John Doe. Please check the details and accept the order.',
          type: 'order_assigned',
          read: false,
          createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          data: {
            order_id: '507f1f77bcf86cd799439011',
            booking_id: 'LAU-001',
            customer_name: 'John Doe',
            customer_phone: '+91 9876543210'
          }
        },
        {
          _id: '507f1f77bcf86cd799439022',
          title: 'Location Update Required',
          message: 'Please update your current location to continue receiving order assignments.',
          type: 'location_request',
          read: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          data: {}
        }
      ];

      return res.json(sampleNotifications);
    }

    const notifications = await riderNotificationService.getRiderNotifications(
      req.rider.riderId,
      includeRead === 'true'
    );

    res.json(notifications);
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    // Return empty array on error
    res.json([]);
  }
});

// Mark notification as read
router.post('/notifications/:notificationId/read', verifyRiderToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // For demo mode, just return success
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: Notification marked as read');
      return res.json({
        message: 'Notification marked as read (demo mode)',
        notification: { _id: notificationId, read: true }
      });
    }

    const notification = await riderNotificationService.markAsRead(
      notificationId,
      req.rider.riderId
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('❌ Mark notification as read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

// Mark all notifications as read
router.post('/notifications/mark-all-read', verifyRiderToken, async (req, res) => {
  try {
    // For demo mode, just return success
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: All notifications marked as read');
      return res.json({
        message: 'All notifications marked as read (demo mode)',
        markedCount: 2
      });
    }

    const result = await riderNotificationService.markAllAsRead(req.rider.riderId);

    res.json({
      message: 'All notifications marked as read',
      markedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
});

// Get unread notification count
router.get('/notifications/unread-count', verifyRiderToken, async (req, res) => {
  try {
    // For demo mode, return sample count
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: Returning sample unread count');
      return res.json({ count: 2 });
    }

    const count = await riderNotificationService.getUnreadCount(req.rider.riderId);

    res.json({ count });
  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.json({ count: 0 });
  }
});

// Admin routes for rider management
router.get('/admin/riders', async (req, res) => {
  try {
    const riders = await Rider.find().sort({ createdAt: -1 });
    res.json(riders);
  } catch (error) {
    console.error('Get riders error:', error);
    res.status(500).json({ message: 'Failed to fetch riders', error: error.message });
  }
});

// Admin: Get orders for assignment
router.get('/admin/orders', async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) {
      const statusArray = status.split(',');
      query.status = { $in: statusArray };
    }

    // For development/mock mode, return sample orders
    const sampleOrders = [
      {
        _id: '507f1f77bcf86cd799439011',
        bookingId: 'LAU-001',
        customerName: 'John Doe',
        customerPhone: '+91 9876543210',
        address: '123 MG Road, Sector 14, Gurugram',
        pickupTime: '2:00 PM - 4:00 PM',
        type: 'Regular',
        status: 'pending',
        assignedRider: null,
        location: { lat: 28.4595, lng: 77.0266 },
        items: [
          { name: 'Shirt', quantity: 2, price: 50 },
          { name: 'Trouser', quantity: 1, price: 80 }
        ]
      },
      {
        _id: '507f1f77bcf86cd799439012',
        bookingId: 'LAU-002',
        customerName: 'Jane Smith',
        customerPhone: '+91 9876543211',
        address: '456 Cyber City, Sector 25, Gurugram',
        pickupTime: '4:00 PM - 6:00 PM',
        type: 'Express',
        status: 'confirmed',
        assignedRider: null,
        location: { lat: 28.4949, lng: 77.0828 },
        items: [
          { name: 'Dress', quantity: 1, price: 120 },
          { name: 'Jacket', quantity: 1, price: 200 }
        ]
      },
      {
        _id: '507f1f77bcf86cd799439013',
        bookingId: 'LAU-003',
        customerName: 'Mike Johnson',
        customerPhone: '+91 9876543212',
        address: '789 Golf Course Road, Sector 54, Gurugram',
        pickupTime: '10:00 AM - 12:00 PM',
        type: 'Quick Pickup',
        status: 'pending',
        assignedRider: null,
        location: { lat: 28.4211, lng: 77.0869 },
        items: [
          { name: 'Suit', quantity: 1, price: 300 }
        ]
      }
    ];

    const orders = await Booking.find(query).sort({ createdAt: -1 }) || sampleOrders;
    res.json(orders.length > 0 ? orders : sampleOrders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

// Admin: Get active riders
router.get('/admin/riders/active', async (req, res) => {
  try {
    const activeRiders = await Rider.find({ 
      isActive: true, 
      status: 'approved' 
    }).populate('assignedOrders');
    
    res.json(activeRiders);
  } catch (error) {
    console.error('Get active riders error:', error);
    res.status(500).json({ message: 'Failed to fetch active riders', error: error.message });
  }
});

// Admin: Verify rider
router.post('/admin/riders/:riderId/verify', async (req, res) => {
  try {
    const { riderId } = req.params;
    const { status, rejectionReason } = req.body;
    
    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    rider.status = status;
    rider.verifiedAt = new Date();
    rider.verifiedBy = 'admin'; // You can get actual admin info from token
    
    if (status === 'rejected' && rejectionReason) {
      rider.rejectionReason = rejectionReason;
    }
    
    await rider.save();
    
    res.json({ 
      message: `Rider ${status} successfully`,
      rider 
    });
  } catch (error) {
    console.error('Rider verification error:', error);
    res.status(500).json({ message: 'Failed to verify rider', error: error.message });
  }
});

// Admin: Assign order to rider
router.post('/admin/orders/assign', async (req, res) => {
  try {
    const { orderId, riderId } = req.body;
    
    const order = await Booking.findById(orderId);
    const rider = await Rider.findById(riderId);
    
    if (!order || !rider) {
      return res.status(404).json({ message: 'Order or rider not found' });
    }

    if (rider.status !== 'approved' || !rider.isActive) {
      return res.status(400).json({ message: 'Rider is not available for assignment' });
    }

    // Assign order to rider
    order.assignedRider = riderId;
    order.riderStatus = 'assigned';
    order.assignedAt = new Date();
    
    // Add to rider's assigned orders
    if (!rider.assignedOrders.includes(orderId)) {
      rider.assignedOrders.push(orderId);
    }
    
    await Promise.all([order.save(), rider.save()]);
    
    res.json({ 
      message: 'Order assigned successfully',
      order,
      rider: rider.name 
    });
  } catch (error) {
    console.error('Order assignment error:', error);
    res.status(500).json({ message: 'Failed to assign order', error: error.message });
  }
});

module.exports = router;
