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

// Basic admin API for testing
app.get('/api/admin/riders', (req, res) => {
  console.log('📋 Admin riders endpoint called');
  res.json([
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
  ]);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
  console.log(`📁 Uploads available at http://localhost:${PORT}/uploads/`);
  console.log(`🔗 Admin API available at http://localhost:${PORT}/api/admin/riders`);
});
