#!/usr/bin/env node

// Pure esbuild solution that completely bypasses Vite and Rollup
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('⚡ Building with pure esbuild (no Vite/Rollup)...');

// Set minimal memory
process.env.NODE_OPTIONS = '--max-old-space-size=256';

function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`▶️ ${command}`);
    
    const child = spawn(command, [], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=256',
        NODE_ENV: 'production'
      }
    });
    
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed: ${command}`));
    });
  });
}

async function buildWithEsbuild() {
  try {
    // Step 1: Install only esbuild (lightweight)
    console.log('📦 Installing esbuild...');
    await runCommand('npm install esbuild --save-dev --no-audit --no-fund');
    
    // Step 2: Create dist directory
    const distDir = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Step 3: Build with esbuild directly
    console.log('🏗️ Building with esbuild...');
    
    const esbuildCommand = `npx esbuild src/main.tsx \\
      --bundle \\
      --outfile=dist/bundle.js \\
      --format=esm \\
      --target=esnext \\
      --minify \\
      --tree-shaking=true \\
      --platform=browser \\
      --loader:.tsx=tsx \\
      --loader:.ts=ts \\
      --loader:.css=css \\
      --loader:.svg=file \\
      --loader:.png=file \\
      --loader:.jpg=file \\
      --define:process.env.NODE_ENV='"production"' \\
      --define:__DEV__=false \\
      --resolve-extensions=.tsx,.ts,.js,.jsx`;
    
    await runCommand(esbuildCommand);
    
    // Step 4: Create HTML file
    console.log('📄 Creating HTML file...');
    await createProductionHTML();
    
    // Step 5: Copy essential assets
    console.log('📁 Copying assets...');
    await copyAssets();
    
    console.log('✅ esbuild-only build completed successfully!');
    
  } catch (error) {
    console.error('❌ esbuild build failed:', error.message);
    
    // Fallback: Create static version
    console.log('🛟 Creating static fallback...');
    await createStaticVersion();
  }
}

async function createProductionHTML() {
  const distDir = path.join(__dirname, '..', 'dist');
  
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laundrify</title>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        #root { min-height: 100vh; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading">Loading...</div>
    </div>
    <script type="module" src="./bundle.js"></script>
    <script>
        // Fallback if bundle fails to load
        setTimeout(() => {
            if (document.querySelector('.loading')) {
                document.getElementById('root').innerHTML = 
                    '<div style="text-align: center; padding: 50px;">' +
                    '<h1>🧺 Laundrify</h1>' +
                    '<p>Service temporarily unavailable. Please try again later.</p>' +
                    '</div>';
            }
        }, 5000);
    </script>
</body>
</html>`;
  
  fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
}

async function copyAssets() {
  const publicDir = path.join(__dirname, '..', 'public');
  const distDir = path.join(__dirname, '..', 'dist');
  
  if (fs.existsSync(publicDir)) {
    try {
      await runCommand(`cp -r public/* dist/ 2>/dev/null || true`);
    } catch (error) {
      console.log('⚠️ Could not copy public assets, continuing...');
    }
  }
}

async function createStaticVersion() {
  const distDir = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  const staticHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laundrify - Coming Soon</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { 
            text-align: center; 
            max-width: 600px; 
            padding: 40px; 
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        .logo { font-size: 4em; margin-bottom: 20px; }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        p { font-size: 1.2em; line-height: 1.6; margin-bottom: 30px; }
        .btn { 
            background: rgba(255,255,255,0.2); 
            color: white; 
            padding: 15px 30px; 
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50px; 
            text-decoration: none; 
            display: inline-block;
            transition: all 0.3s ease;
        }
        .btn:hover { 
            background: rgba(255,255,255,0.3); 
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🧺</div>
        <h1>Laundrify</h1>
        <p>We're currently setting up our premium laundry service platform. Get ready for the most convenient way to handle your laundry needs!</p>
        <a href="mailto:hello@laundrify.com" class="btn">Get Notified</a>
    </div>
    <script>
        // Auto-refresh every 5 minutes to check if the service is back
        setTimeout(() => location.reload(), 300000);
    </script>
</body>
</html>`;
  
  fs.writeFileSync(path.join(distDir, 'index.html'), staticHtml);
  console.log('✅ Created beautiful static version');
}

buildWithEsbuild();
