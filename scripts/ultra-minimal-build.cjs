#!/usr/bin/env node

// Ultra-minimal build script optimized for 512MB memory environments
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set extremely conservative memory allocation - leaving room for OS overhead
process.env.NODE_OPTIONS = '--max-old-space-size=256 --gc-interval=100';

console.log('🚀 Starting ultra-minimal build for 512MB constraint...');
console.log('💾 Memory limit: 256MB for Node.js process');

// Function to force garbage collection
function forceGC() {
  if (global.gc) {
    console.log('🗑️ Running garbage collection...');
    global.gc();
  }
}

// Function to run command with minimal memory settings
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`▶️ Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=256 --gc-interval=100',
        NODE_ENV: 'production',
        // Disable V8 optimization flags that use more memory
        NODE_NO_WARNINGS: '1'
      }
    });
    
    child.on('close', (code) => {
      forceGC();
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error('Process error:', error);
      reject(error);
    });
  });
}

// Clean up dist directory to free space
function cleanDist() {
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    console.log('🧹 Cleaning previous build...');
    fs.rmSync(distPath, { recursive: true, force: true });
  }
}

async function main() {
  try {
    // Clean up first
    cleanDist();
    forceGC();
    
    console.log('📦 Starting minimal build process...');
    console.log('⚠️ Skipping all non-essential features to conserve memory');
    
    // Use the ultra-minimal vite config
    await runCommand('npx', [
      'vite',
      'build',
      '--config',
      'vite.ultra-minimal.config.ts',
      '--mode',
      'production',
      '--logLevel',
      'warn' // Reduce logging to save memory
    ]);
    
    console.log('✅ Ultra-minimal build completed successfully!');
    console.log('📊 Build optimized for maximum memory efficiency');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.error('�� Try reducing dependencies or using build:production script');
    process.exit(1);
  }
}

// Handle memory pressure
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.warn('⚠️ Memory pressure detected, forcing garbage collection');
    forceGC();
  }
});

main();
