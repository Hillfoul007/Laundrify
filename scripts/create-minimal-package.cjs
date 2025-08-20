#!/usr/bin/env node

// Script to create a minimal package.json for memory-constrained builds
const fs = require('fs');
const path = require('path');

console.log('🔧 Creating minimal package.json for build...');

// Read the original package.json
const originalPackagePath = path.join(__dirname, '..', 'package.json');
const originalPackage = JSON.parse(fs.readFileSync(originalPackagePath, 'utf8'));

// Create a minimal version
const minimalPackage = {
  ...originalPackage,
  dependencies: {
    // Keep only essential dependencies for build
    "@radix-ui/react-accordion": originalPackage.dependencies["@radix-ui/react-accordion"],
    "@radix-ui/react-alert-dialog": originalPackage.dependencies["@radix-ui/react-alert-dialog"],
    "@radix-ui/react-aspect-ratio": originalPackage.dependencies["@radix-ui/react-aspect-ratio"],
    "@radix-ui/react-avatar": originalPackage.dependencies["@radix-ui/react-avatar"],
    "@radix-ui/react-checkbox": originalPackage.dependencies["@radix-ui/react-checkbox"],
    "@radix-ui/react-dialog": originalPackage.dependencies["@radix-ui/react-dialog"],
    "@radix-ui/react-dropdown-menu": originalPackage.dependencies["@radix-ui/react-dropdown-menu"],
    "@radix-ui/react-label": originalPackage.dependencies["@radix-ui/react-label"],
    "@radix-ui/react-popover": originalPackage.dependencies["@radix-ui/react-popover"],
    "@radix-ui/react-select": originalPackage.dependencies["@radix-ui/react-select"],
    "@radix-ui/react-separator": originalPackage.dependencies["@radix-ui/react-separator"],
    "@radix-ui/react-slot": originalPackage.dependencies["@radix-ui/react-slot"],
    "@radix-ui/react-switch": originalPackage.dependencies["@radix-ui/react-switch"],
    "@radix-ui/react-tabs": originalPackage.dependencies["@radix-ui/react-tabs"],
    "@radix-ui/react-toast": originalPackage.dependencies["@radix-ui/react-toast"],
    "class-variance-authority": originalPackage.dependencies["class-variance-authority"],
    "clsx": originalPackage.dependencies["clsx"],
    "cmdk": originalPackage.dependencies["cmdk"],
    "date-fns": originalPackage.dependencies["date-fns"],
    "lucide-react": originalPackage.dependencies["lucide-react"],
    "next-themes": originalPackage.dependencies["next-themes"],
    "react": originalPackage.dependencies["react"],
    "react-dom": originalPackage.dependencies["react-dom"],
    "react-hook-form": originalPackage.dependencies["react-hook-form"],
    "react-router-dom": originalPackage.dependencies["react-router-dom"],
    "sonner": originalPackage.dependencies["sonner"],
    "tailwind-merge": originalPackage.dependencies["tailwind-merge"],
    "tailwindcss-animate": originalPackage.dependencies["tailwindcss-animate"],
    "vaul": originalPackage.dependencies["vaul"],
    
    // Keep essential backend dependencies
    "body-parser": originalPackage.dependencies["body-parser"],
    "compression": originalPackage.dependencies["compression"],
    "cookie-parser": originalPackage.dependencies["cookie-parser"],
    "cors": originalPackage.dependencies["cors"],
    "express": originalPackage.dependencies["express"],
    "helmet": originalPackage.dependencies["helmet"],
    "morgan": originalPackage.dependencies["morgan"],
    
    // Skip heavy dependencies to save memory:
    // - @googlemaps/js-api-loader
    // - recharts
    // - embla-carousel-react
    // - mongodb
    // - mongoose
    // - googleapis
  }
};

// Backup original package.json
const backupPath = path.join(__dirname, '..', 'package.json.backup');
fs.writeFileSync(backupPath, fs.readFileSync(originalPackagePath));

// Write minimal package.json
fs.writeFileSync(originalPackagePath, JSON.stringify(minimalPackage, null, 2));

console.log('✅ Created minimal package.json');
console.log('📦 Excluded heavy dependencies to reduce memory usage');
console.log('💾 Original package.json backed up as package.json.backup');
