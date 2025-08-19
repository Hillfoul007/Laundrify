const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS middleware
app.use(cors({
  origin: [
    'http://localhost:10000',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:10000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads/riders');
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

// Serve static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
console.log("📁 Static files served from /uploads");

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Minimal server running' });
});

// Store registered riders in memory for demo
let registeredRiders = [
  {
    _id: '507f191e810c19729de860ea',
    name: 'Rajesh Kumar',
    phone: '+91 9876543210',
    aadharNumber: '1234-5678-9012',
    status: 'pending',
    createdAt: new Date(),
    aadharImageUrl: '/uploads/riders/aadhar-sample.jpg',
    selfieImageUrl: '/uploads/riders/selfie-sample.jpg'
  },
  {
    _id: '507f191e810c19729de860eb',
    name: 'Amit Singh',
    phone: '+91 9876543211',
    aadharNumber: '1234-5678-9013',
    status: 'approved',
    createdAt: new Date(),
    aadharImageUrl: '/uploads/riders/aadhar-sample2.jpg',
    selfieImageUrl: '/uploads/riders/selfie-sample2.jpg'
  }
];

// Basic admin API for testing
app.get('/api/admin/riders', (req, res) => {
  console.log('📋 Admin riders endpoint called');
  res.json(registeredRiders);
});

// Mock OTP service
const mockOTPs = new Map();

// OTP request endpoint for rider login
app.post('/api/riders/request-otp', (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }

    // Generate mock OTP
    const otp = '123456'; // Fixed OTP for demo
    mockOTPs.set(phone + '_login', otp);

    console.log('📱 OTP request for login:', phone, 'OTP:', otp);

    res.json({
      message: 'OTP sent successfully',
      // In demo mode, we can show the OTP for testing
      demo_otp: otp
    });
  } catch (error) {
    console.error('❌ OTP request error:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// OTP verification endpoint for rider login
app.post('/api/riders/verify-otp', (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: 'Phone number and OTP are required'
      });
    }

    // Verify OTP
    const storedOTP = mockOTPs.get(phone + '_login');
    if (!storedOTP || storedOTP !== otp) {
      return res.status(400).json({
        message: 'Invalid or expired OTP'
      });
    }

    // Remove used OTP
    mockOTPs.delete(phone + '_login');

    // Find or create rider
    const existingRider = registeredRiders.find(r => r.phone === phone);

    if (!existingRider) {
      return res.status(404).json({
        message: 'Rider not found. Please register first.'
      });
    }

    console.log('✅ Rider OTP login successful:', phone);

    res.json({
      message: 'Login successful',
      rider: existingRider,
      token: 'demo_token_' + Date.now()
    });
  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({ message: 'OTP verification failed', error: error.message });
  }
});

// OTP request endpoint for rider registration
app.post('/api/riders/register/request-otp', (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: 'Phone number is required'
      });
    }

    // Generate mock OTP
    const otp = '123456'; // Fixed OTP for demo
    mockOTPs.set(phone, otp);

    console.log('📱 OTP request for registration:', phone, 'OTP:', otp);

    res.json({
      message: 'OTP sent successfully',
      // In demo mode, we can show the OTP for testing
      demo_otp: otp
    });
  } catch (error) {
    console.error('❌ OTP request error:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// Rider registration endpoint with file upload
app.post('/api/riders/register', upload.fields([
  { name: 'aadharImage', maxCount: 1 },
  { name: 'selfieImage', maxCount: 1 }
]), (req, res) => {
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

    // Verify OTP
    const storedOTP = mockOTPs.get(phone);
    if (!storedOTP || storedOTP !== otp) {
      return res.status(400).json({
        message: 'Invalid or expired OTP'
      });
    }

    // Remove used OTP
    mockOTPs.delete(phone);

    // Check if files were uploaded
    if (!req.files?.aadharImage?.[0] || !req.files?.selfieImage?.[0]) {
      return res.status(400).json({
        message: 'Both Aadhar card image and selfie are required'
      });
    }

    console.log('📁 Files uploaded:', {
      aadharImage: req.files.aadharImage[0].filename,
      selfieImage: req.files.selfieImage[0].filename
    });

    // Create new rider
    const newRider = {
      _id: 'rider_' + Date.now(),
      name,
      phone,
      aadharNumber,
      status: 'pending',
      createdAt: new Date(),
      aadharImageUrl: `/uploads/riders/${req.files.aadharImage[0].filename}`,
      selfieImageUrl: `/uploads/riders/${req.files.selfieImage[0].filename}`,
    };

    // Add to our in-memory store
    registeredRiders.push(newRider);

    console.log('✅ Rider registered successfully:', name);
    console.log('📸 Image paths:', {
      aadhar: newRider.aadharImageUrl,
      selfie: newRider.selfieImageUrl
    });

    res.status(201).json({
      message: 'Registration submitted successfully. Please wait for admin approval.',
      riderId: newRider._id
    });
  } catch (error) {
    console.error('❌ Rider registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
  console.log(`📁 Uploads available at http://localhost:${PORT}/uploads/`);
  console.log(`🔗 Admin API available at http://localhost:${PORT}/api/admin/riders`);
});
