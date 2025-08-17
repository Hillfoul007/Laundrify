// Cache busting utility to help with CSS/JS loading issues
(function() {
  'use strict';
  
  // Force reload stylesheets if they fail to load
  function fixStylesheetLoading() {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    
    stylesheets.forEach((link, index) => {
      // Check if stylesheet failed to load
      if (!link.sheet || link.sheet.cssRules.length === 0) {
        console.warn('🔧 Reloading failed stylesheet:', link.href);
        
        // Create new link element
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.type = 'text/css';
        newLink.href = link.href + (link.href.includes('?') ? '&' : '?') + 'cb=' + Date.now();
        
        // Replace old link
        link.parentNode.insertBefore(newLink, link);
        link.remove();
        
        // Add error handler to new link
        newLink.onerror = function() {
          console.error('❌ Still failed to load stylesheet:', newLink.href);
        };
        
        newLink.onload = function() {
          console.log('✅ Successfully reloaded stylesheet:', newLink.href);
        };
      }
    });
  }
  
  // Run immediately and after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixStylesheetLoading);
  } else {
    setTimeout(fixStylesheetLoading, 100);
  }
  
  // Also run on window load as fallback
  window.addEventListener('load', function() {
    setTimeout(fixStylesheetLoading, 500);
  });
  
})();
