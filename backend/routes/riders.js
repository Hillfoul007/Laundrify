const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Rider = require("../models/Rider");
const Booking = require("../models/Booking");

const router = express.Router();

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
      bodyKeys: Object.keys(req.body)
    });

    const { phone, password } = req.body;

    if (!phone || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ message: 'Phone and password are required' });
    }

    // For development/demo mode when no database is connected
    if (!mongoose.connection.readyState) {
      console.log('🔧 Demo mode: Creating test rider login');
      const demoRider = {
        _id: 'demo_rider_' + Date.now(),
        name: 'Demo Rider',
        phone: phone,
        status: 'approved',
        isActive: false,
      };

      const token = jwt.sign(
        { riderId: demoRider._id, phone: demoRider.phone },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        rider: demoRider
      });
    }

    // Find rider by phone
    const rider = await Rider.findOne({ phone });
    if (!rider) {
      console.log('❌ Rider not found:', phone);
      return res.status(400).json({ message: 'Invalid phone number or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, rider.password);
    if (!isMatch) {
      console.log('❌ Invalid password for rider:', phone);
      return res.status(400).json({ message: 'Invalid phone number or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { riderId: rider._id, phone: rider.phone },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    console.log('✅ Rider login successful:', rider.name);
    res.json({
      token,
      rider: {
        _id: rider._id,
        name: rider.name,
        phone: rider.phone,
        status: rider.status,
        isActive: rider.isActive,
      }
    });
  } catch (error) {
    console.error('❌ Rider login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Update rider location
router.post('/location', verifyRiderToken, async (req, res) => {
  try {
    const { location } = req.body;
    
    const rider = await Rider.findById(req.rider.riderId);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    await rider.updateLocation(location.lat, location.lng);
    
    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ message: 'Failed to update location', error: error.message });
  }
});

// Toggle rider active status
router.post('/toggle-status', verifyRiderToken, async (req, res) => {
  try {
    const { isActive, location } = req.body;
    
    const rider = await Rider.findById(req.rider.riderId);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    if (rider.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved riders can go active' });
    }

    rider.isActive = isActive;
    
    if (isActive && location) {
      await rider.updateLocation(location.lat, location.lng);
    }
    
    await rider.save();
    
    res.json({ 
      message: `Status updated to ${isActive ? 'active' : 'inactive'}`,
      isActive: rider.isActive 
    });
  } catch (error) {
    console.error('Status toggle error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
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
