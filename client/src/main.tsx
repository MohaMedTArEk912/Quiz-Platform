import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'

// Mobile Performance Optimization: Preload critical resources
const preloadCriticalResources = () => {
  // Warm up API connection early
  const apiUrl = import.meta.env.VITE_API_URL || '/api';

  // Use link preconnect for faster API requests
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = window.location.origin;
  document.head.appendChild(link);

  // Prefetch health check to warm up backend (especially important for serverless)
  fetch(`${apiUrl}/health-check`, {
    method: 'GET',
    priority: 'low' as RequestPriority
  }).catch(() => {
    // Silently fail - this is just a warmup
  });
};

// Run preload on mobile devices
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  preloadCriticalResources();
}

// Register service worker for PWA (improves subsequent loads)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, continue without it
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

