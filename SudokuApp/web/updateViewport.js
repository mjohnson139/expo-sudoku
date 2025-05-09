// Script to handle viewport and scaling for responsive display on web
window.addEventListener('DOMContentLoaded', function() {
  // Update viewport meta tag for better mobile web experience
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    // Set optimal viewport settings for touch devices
    viewportMeta.content = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no';
  }
  
  // Handle keyboard visibility for better input experience
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      // When input is focused, allow scrolling and zooming
      if (viewportMeta) {
        viewportMeta.content = 'width=device-width, initial-scale=1, minimum-scale=1';
      }
    });
    
    input.addEventListener('blur', function() {
      // When input loses focus, reset to non-scalable
      if (viewportMeta) {
        viewportMeta.content = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no';
      }
    });
  });
  
  // Apply platform-specific styles
  const root = document.getElementById('root');
  if (root) {
    root.classList.add('web-platform');
  }
});