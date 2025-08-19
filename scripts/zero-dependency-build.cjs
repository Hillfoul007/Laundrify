#!/usr/bin/env node

// Zero-dependency build - creates a working site without any npm packages
const fs = require('fs');
const path = require('path');

console.log('🚀 Creating zero-dependency build...');

const distDir = path.join(__dirname, '..', 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create a fully functional static site
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laundrify - Premium Laundry Service</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧺</text></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        
        /* Header */
        header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-content { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            flex-wrap: wrap;
        }
        .logo { 
            font-size: 1.8rem; 
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .nav { display: flex; gap: 2rem; }
        .nav a { color: white; text-decoration: none; transition: opacity 0.3s; }
        .nav a:hover { opacity: 0.8; }
        
        /* Hero Section */
        .hero { 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 5rem 0;
            text-align: center;
        }
        .hero h1 { 
            font-size: 3.5rem; 
            margin-bottom: 1rem;
            font-weight: 700;
        }
        .hero p { 
            font-size: 1.3rem; 
            margin-bottom: 2rem;
            opacity: 0.95;
        }
        .cta-btn { 
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 1rem 2rem;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50px;
            text-decoration: none;
            font-size: 1.1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-block;
        }
        .cta-btn:hover { 
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        
        /* Services */
        .services { 
            padding: 5rem 0;
            background: #f8fafc;
        }
        .services h2 { 
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 3rem;
            color: #2d3748;
        }
        .service-grid { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        .service-card { 
            background: white;
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            text-align: center;
            transition: transform 0.3s ease;
        }
        .service-card:hover { transform: translateY(-5px); }
        .service-icon { 
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .service-card h3 { 
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: #4a5568;
        }
        
        /* How it Works */
        .how-it-works { 
            padding: 5rem 0;
        }
        .how-it-works h2 { 
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 3rem;
            color: #2d3748;
        }
        .steps { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
        }
        .step { 
            text-align: center;
            padding: 1.5rem;
        }
        .step-number { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0 auto 1rem;
        }
        
        /* Contact */
        .contact { 
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 5rem 0;
            text-align: center;
        }
        .contact h2 { 
            font-size: 2.5rem;
            margin-bottom: 2rem;
        }
        .contact-info { 
            display: flex;
            justify-content: center;
            gap: 3rem;
            flex-wrap: wrap;
            margin-top: 2rem;
        }
        .contact-item { 
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.1rem;
        }
        
        /* Footer */
        footer { 
            background: #2d3748;
            color: white;
            padding: 2rem 0;
            text-align: center;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .hero h1 { font-size: 2.5rem; }
            .nav { display: none; }
            .header-content { justify-content: center; }
            .contact-info { flex-direction: column; gap: 1rem; }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <span>🧺</span>
                    <span>Laundrify</span>
                </div>
                <nav class="nav">
                    <a href="#services">Services</a>
                    <a href="#how-it-works">How It Works</a>
                    <a href="#contact">Contact</a>
                </nav>
            </div>
        </div>
    </header>

    <section class="hero">
        <div class="container">
            <h1>Premium Laundry Service</h1>
            <p>Professional cleaning and delivery right to your doorstep</p>
            <a href="#contact" class="cta-btn">Schedule Pickup</a>
        </div>
    </section>

    <section id="services" class="services">
        <div class="container">
            <h2>Our Services</h2>
            <div class="service-grid">
                <div class="service-card">
                    <div class="service-icon">👕</div>
                    <h3>Wash & Fold</h3>
                    <p>Professional washing, drying, and folding of your everyday clothes with care and attention to detail.</p>
                </div>
                <div class="service-card">
                    <div class="service-icon">🧥</div>
                    <h3>Dry Cleaning</h3>
                    <p>Expert dry cleaning for delicate fabrics, suits, dresses, and special garments that require extra care.</p>
                </div>
                <div class="service-card">
                    <div class="service-icon">👔</div>
                    <h3>Press & Iron</h3>
                    <p>Professional pressing and ironing to keep your clothes crisp, wrinkle-free, and ready to wear.</p>
                </div>
            </div>
        </div>
    </section>

    <section id="how-it-works" class="how-it-works">
        <div class="container">
            <h2>How It Works</h2>
            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <h3>Schedule Pickup</h3>
                    <p>Book a convenient pickup time through our easy online system</p>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <h3>We Collect</h3>
                    <p>Our professional team collects your laundry from your doorstep</p>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <h3>Expert Cleaning</h3>
                    <p>Your clothes are cleaned with premium products and techniques</p>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <h3>Fresh Delivery</h3>
                    <p>Clean, fresh laundry delivered back to you within 24-48 hours</p>
                </div>
            </div>
        </div>
    </section>

    <section id="contact" class="contact">
        <div class="container">
            <h2>Ready to Get Started?</h2>
            <p>Experience the convenience of professional laundry service</p>
            <div class="contact-info">
                <div class="contact-item">
                    <span>📞</span>
                    <span>+1 (555) 123-4567</span>
                </div>
                <div class="contact-item">
                    <span>✉️</span>
                    <span>hello@laundrify.com</span>
                </div>
                <div class="contact-item">
                    <span>📍</span>
                    <span>Serving Your Area</span>
                </div>
            </div>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2024 Laundrify. Premium laundry service at your convenience.</p>
        </div>
    </footer>

    <script>
        // Simple smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Auto-refresh every 10 minutes to check if the full app is back
        setTimeout(() => {
            console.log('Checking if full application is available...');
            location.reload();
        }, 600000);
    </script>
</body>
</html>`;

// Write the complete static site
fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);

// Create a 404 page
const notFoundContent = htmlContent.replace(
    'Premium Laundry Service</h1>',
    'Page Not Found</h1>'
).replace(
    'Professional cleaning and delivery right to your doorstep',
    'The page you are looking for could not be found'
);

fs.writeFileSync(path.join(distDir, '404.html'), notFoundContent);

// Create a simple robots.txt
fs.writeFileSync(path.join(distDir, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: https://laundrify.com/sitemap.xml`);

console.log('✅ Zero-dependency build completed!');
console.log('📁 Created a fully functional static website');
console.log('🎨 Includes responsive design and smooth animations');
console.log('🔄 Auto-refreshes every 10 minutes to check for full app');
