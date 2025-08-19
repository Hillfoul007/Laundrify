#!/usr/bin/env node

// Emergency build script for extreme memory constraints
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Extremely conservative memory allocation
process.env.NODE_OPTIONS = '--max-old-space-size=200 --gc-interval=50';

console.log('🚨 Emergency build mode activated');
console.log('💾 Memory limit: 200MB (leaving 312MB for system)');

function forceGC() {
  if (global.gc) {
    global.gc();
  }
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=200',
        NODE_ENV: 'production',
        CI: 'true'
      }
    });
    
    child.on('close', (code) => {
      forceGC();
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${code}`));
    });
    
    child.on('error', reject);
  });
}

async function main() {
  try {
    // Clean everything
    console.log('🧹 Cleaning all build artifacts...');
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true, force: true });
    }
    
    // Force GC
    forceGC();
    
    // Use simple vite build without any extra configs
    console.log('📦 Running basic vite build...');
    await runCommand('npx', ['vite', 'build', '--mode', 'production']);
    
    console.log('✅ Emergency build completed!');
    
  } catch (error) {
    console.error('❌ Emergency build failed:', error.message);
    console.error('💡 Try manually running: npx vite build --mode production');
    process.exit(1);
  }
}

main();
