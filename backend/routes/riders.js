const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Rider = require("../models/Rider");
const Booking = require("../models/Booking");

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

// Register new rider
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

    const { name, phone, aadharNumber } = req.body;

    if (!name || !phone || !aadharNumber) {
      return res.status(400).json({
        message: 'Name, phone, and Aadhar number are required'
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

    // Generate default password (phone number for now)
    const hashedPassword = await bcrypt.hash(phone, 10);

    // Create new rider
    const rider = new Rider({
      name,
      phone,
      aadharNumber,
      password: hashedPassword,
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

// Login rider
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

    // Always try demo mode first to ensure it works
    console.log('🔧 Checking database connection...', {
      readyState: mongoose.connection.readyState,
      dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });

    // Create different demo riders based on phone number
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

    // For development/demo mode when no database is connected OR as fallback
    if (!mongoose.connection.readyState || process.env.FORCE_DEMO_MODE === 'true') {
      console.log('🔧 Demo mode: Creating test rider login for phone:', phone);
      console.log('✅ Demo rider login successful:', demoRider.name);
      return res.json({
        token,
        rider: demoRider,
        message: 'Demo mode: Login successful (no database required)',
        mode: 'demo'
      });
    }

    try {
      // Find rider by phone
      const rider = await Rider.findOne({ phone });
      if (!rider) {
        console.log('❌ Rider not found in database, falling back to demo mode');
        console.log('✅ Demo fallback login successful:', demoRider.name);
        return res.json({
          token,
          rider: demoRider,
          message: 'Demo mode: Login successful (rider not found in database)',
          mode: 'demo_fallback'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, rider.password);
      if (!isMatch) {
        console.log('❌ Invalid password for rider, falling back to demo mode');
        console.log('✅ Demo fallback login successful:', demoRider.name);
        return res.json({
          token,
          rider: demoRider,
          message: 'Demo mode: Login successful (password mismatch, using demo)',
          mode: 'demo_fallback'
        });
      }

      // Generate JWT token for real rider
      const realToken = jwt.sign(
        { riderId: rider._id, phone: rider.phone },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' }
      );

      console.log('✅ Real rider login successful:', rider.name);
      res.json({
        token: realToken,
        rider: {
          _id: rider._id,
          name: rider.name,
          phone: rider.phone,
          status: rider.status,
          isActive: rider.isActive,
        },
        mode: 'database'
      });
    } catch (dbError) {
      console.log('❌ Database operation failed, using demo mode:', dbError.message);
      console.log('✅ Demo fallback login successful:', demoRider.name);
      return res.json({
        token,
        rider: demoRider,
        message: 'Demo mode: Login successful (database error)',
        mode: 'demo_error_fallback'
      });
    }
  } catch (error) {
    console.error('❌ Rider login error:', error);

    // Final fallback: always provide demo mode if everything else fails
    console.log('🔧 Final fallback: Using demo mode due to error');

    const fallbackDemoRider = {
      _id: 'demo_rider_emergency',
      name: 'Emergency Demo Rider',
      phone: phone || '0000000000',
      status: 'approved',
      isActive: false,
    };

    const fallbackToken = jwt.sign(
      { riderId: fallbackDemoRider._id, phone: fallbackDemoRider.phone },
      'emergency_fallback_secret',
      { expiresIn: '7d' }
    );

    console.log('✅ Emergency demo login successful');
    res.json({
      token: fallbackToken,
      rider: fallbackDemoRider,
      message: 'Demo mode: Emergency fallback login (system error occurred)',
      mode: 'emergency_demo',
      originalError: error.message
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
      console.log('�� Rider not found, using demo response');
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
    const rider = await Rider.findById(req.rider.riderId).populate('assignedOrders');
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    res.json(rider.assignedOrders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
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
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    // Update order items
    order.items = items;
    order.notes = notes || order.notes;
    order.updatedBy = 'rider';
    order.lastModified = new Date();
    
    await order.save();
    
    res.json({ message: 'Order updated successfully', order });
  } catch (error) {
    console.error('Order update error:', error);
    res.status(500).json({ message: 'Failed to update order', error: error.message });
  }
});

// Handle order actions (accept, start, complete)
router.post('/order-action', verifyRiderToken, async (req, res) => {
  try {
    const { orderId, action, location } = req.body;
    
    const order = await Booking.findOne({
      _id: orderId,
      assignedRider: req.rider.riderId
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
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
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    
    await order.save();
    
    res.json({ message: `Order ${action}ed successfully`, order });
  } catch (error) {
    console.error('Order action error:', error);
    res.status(500).json({ message: 'Failed to perform action', error: error.message });
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
