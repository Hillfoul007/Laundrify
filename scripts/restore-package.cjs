#!/usr/bin/env node

// Script to restore the original package.json after minimal build
const fs = require('fs');
const path = require('path');

console.log('🔄 Restoring original package.json...');

const originalPackagePath = path.join(__dirname, '..', 'package.json');
const backupPath = path.join(__dirname, '..', 'package.json.backup');

if (fs.existsSync(backupPath)) {
  fs.writeFileSync(originalPackagePath, fs.readFileSync(backupPath));
  fs.unlinkSync(backupPath);
  console.log('✅ Original package.json restored');
} else {
  console.log('⚠️ No backup found, package.json unchanged');
}
