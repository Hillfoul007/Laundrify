#!/usr/bin/env node

// Create a static fallback if build completely fails
const fs = require('fs');
const path = require('path');

console.log('🛟 Creating static fallback...');

const distDir = path.join(__dirname, '..', 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create minimal index.html
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laundrify - Service Temporarily Unavailable</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .logo { font-size: 2em; color: #6366f1; margin-bottom: 20px; }
        .message { font-size: 1.2em; margin-bottom: 30px; color: #666; }
        .btn { background: #6366f1; color: white; padding: 12px 24px; border: none; border-radius: 6px; text-decoration: none; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🧺 Laundrify</div>
        <h1>Service Temporarily Unavailable</h1>
        <p class="message">We're currently updating our systems to serve you better. Please check back in a few minutes.</p>
        <a href="mailto:support@laundrify.com" class="btn">Contact Support</a>
    </div>
    <script>
        // Auto-refresh every 2 minutes
        setTimeout(() => location.reload(), 120000);
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);

// Create a simple 404 page
fs.writeFileSync(path.join(distDir, '404.html'), htmlContent.replace('Service Temporarily Unavailable', 'Page Not Found'));

console.log('✅ Static fallback created at dist/index.html');
console.log('🔄 Page will auto-refresh every 2 minutes');
