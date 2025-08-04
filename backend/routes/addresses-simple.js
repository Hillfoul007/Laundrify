const express = require("express");
const router = express.Router();

// Simple test route
router.get("/", (req, res) => {
  console.log("📍 Simple addresses route called");
  res.json({ 
    success: true, 
    message: "Simple addresses route working",
    timestamp: new Date().toISOString()
  });
});

// Test route
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Addresses test endpoint working",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
