#!/usr/bin/env node

// Emergency deployment fix script for Render
const { spawn } = require('child_process');
const fs = require('path');

console.log('🚨 Emergency deployment fix for Render...');

// Set minimal memory usage
process.env.NODE_OPTIONS = '--max-old-space-size=200';

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${cmd}`);
    const child = spawn(cmd, [], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=200',
        NODE_ENV: 'production',
        npm_config_optional: 'false',
        npm_config_audit: 'false',
        npm_config_fund: 'false'
      }
    });
    
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed: ${cmd}`));
    });
  });
}

async function deployFix() {
  try {
    // Method 1: Try with yarn (often handles optional deps better)
    console.log('🧶 Trying with yarn...');
    try {
      await runCommand('yarn install --production --ignore-optional');
      await runCommand('yarn build');
      console.log('✅ Yarn build succeeded!');
      return;
    } catch (error) {
      console.log('⚠️ Yarn failed, trying npm...');
    }
    
    // Method 2: Clean npm install
    console.log('📦 Trying clean npm install...');
    await runCommand('rm -rf node_modules package-lock.json');
    await runCommand('npm install --no-optional --legacy-peer-deps');
    
    // Method 3: Manual build with specific tool
    console.log('🔨 Manual build with esbuild...');
    try {
      await runCommand('npx esbuild src/main.tsx --bundle --outfile=dist/index.js --format=esm --target=esnext');
      console.log('✅ Manual esbuild succeeded!');
    } catch (error) {
      // Method 4: Basic vite without any configs
      console.log('⚡ Basic vite build...');
      await runCommand('npx vite build');
    }
    
    console.log('✅ Deploy fix completed!');
    
  } catch (error) {
    console.error('❌ All deployment methods failed:', error.message);
    console.error('💡 Manual steps to try:');
    console.error('1. rm -rf node_modules package-lock.json');
    console.error('2. npm install --no-optional');
    console.error('3. npx vite build');
    process.exit(1);
  }
}

deployFix();
