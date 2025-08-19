#!/usr/bin/env node

// Script to fix Rollup dependency issues and perform build
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Conservative memory settings for deployment
process.env.NODE_OPTIONS = '--max-old-space-size=256';

console.log('🔧 Fixing Rollup dependencies and building...');

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`▶️ Running: ${command}`);
    
    const child = spawn(command, [], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=256',
        NODE_ENV: 'production'
      },
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function fixRollupAndBuild() {
  try {
    // Step 1: Clean npm cache and remove problematic files
    console.log('🧹 Cleaning npm cache and lock files...');
    
    const packageLockPath = path.join(__dirname, '..', 'package-lock.json');
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    
    // Remove package-lock.json if it exists
    if (fs.existsSync(packageLockPath)) {
      fs.unlinkSync(packageLockPath);
      console.log('✅ Removed package-lock.json');
    }
    
    // Remove node_modules if it exists
    if (fs.existsSync(nodeModulesPath)) {
      fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      console.log('✅ Removed node_modules');
    }
    
    // Clean npm cache
    try {
      await runCommand('npm cache clean --force');
      console.log('✅ Cleaned npm cache');
    } catch (error) {
      console.log('⚠️ Cache clean failed, continuing...');
    }
    
    // Step 2: Install dependencies with specific flags to fix Rollup issue
    console.log('📦 Installing dependencies with Rollup fix...');
    await runCommand('npm install --no-optional --legacy-peer-deps --no-audit --no-fund');
    
    // Step 3: Force install the specific Rollup binary
    console.log('🔧 Installing Rollup platform-specific binary...');
    try {
      await runCommand('npm install @rollup/rollup-linux-x64-gnu --save-optional');
    } catch (error) {
      console.log('⚠️ Direct Rollup binary install failed, continuing...');
    }
    
    // Step 4: Use esbuild instead of Rollup for the build
    console.log('⚡ Building with esbuild fallback...');
    await runCommand('npx vite build --config vite.ultra-minimal.config.ts');
    
    console.log('✅ Build completed successfully!');
    
  } catch (error) {
    console.error('❌ Build process failed:', error.message);
    
    // Fallback: Try basic vite build without any configs
    console.log('🚨 Attempting emergency fallback build...');
    try {
      await runCommand('npx vite build --mode production');
      console.log('✅ Emergency build succeeded!');
    } catch (fallbackError) {
      console.error('❌ All build attempts failed:', fallbackError.message);
      process.exit(1);
    }
  }
}

fixRollupAndBuild();
