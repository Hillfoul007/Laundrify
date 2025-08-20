#!/usr/bin/env node

// Clean Rollup cache and problematic dependencies that cause build failures
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🧹 Cleaning Rollup cache and problematic dependencies...');

function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`▶️ ${command}`);
    
    const child = spawn(command, [], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${command}`));
    });
  });
}

async function cleanRollupCache() {
  try {
    // Files and directories to remove
    const itemsToClean = [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'node_modules/.cache',
      'node_modules/@rollup',
      'node_modules/rollup',
      '.npm',
      '.yarn/cache'
    ];
    
    // Clean local files
    for (const item of itemsToClean) {
      const itemPath = path.join(__dirname, '..', item);
      if (fs.existsSync(itemPath)) {
        try {
          fs.rmSync(itemPath, { recursive: true, force: true });
          console.log(`✅ Removed ${item}`);
        } catch (error) {
          console.log(`⚠️ Could not remove ${item}: ${error.message}`);
        }
      }
    }
    
    // Clear npm cache
    console.log('🗑️ Clearing npm cache...');
    try {
      await runCommand('npm cache clean --force');
      console.log('✅ npm cache cleared');
    } catch (error) {
      console.log('⚠️ npm cache clean failed');
    }
    
    // Clear npx cache
    console.log('🗑️ Clearing npx cache...');
    try {
      await runCommand('npx clear-npx-cache');
      console.log('✅ npx cache cleared');
    } catch (error) {
      console.log('⚠️ npx cache clean failed');
    }
    
    console.log('✅ Cleanup completed successfully!');
    console.log('💡 Now you can run: npm install --no-optional');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanRollupCache();
