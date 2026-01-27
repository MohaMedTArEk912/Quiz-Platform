/**
 * Vercel Serverless Function - API Proxy
 * Proxies critical endpoints from the primary Koyeb API
 * Serves as fallback when primary is unavailable
 * 
 * This should be deployed to Vercel at: /api/[...path].js
 * Routes like /api/quizzes will be caught and proxied to Koyeb backend
 */

const KOYEB_API = process.env.BACKEND_URL || 'http://localhost:7860';
const TIMEOUT = 15000; // 15 seconds

// MongoDB Atlas connection string (both Koyeb and Vercel use same DB)
// This ensures data consistency across both deployments
const MONGODB_URI = process.env.MONGODB_URI;

// Endpoints that should NOT be proxied (internal operations)
const BLOCKED_ENDPOINTS = [
  '/admin/', // Admin operations
  '/internal/', // Internal operations
];

// Helper function to check if endpoint should be blocked
function isEndpointBlocked(pathname) {
  return BLOCKED_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));
}

// Helper function to forward request headers (excluding sensitive ones)
function getSafeHeaders(incomingHeaders) {
  const safeHeaders = new Headers();
  const headersToForward = ['authorization', 'content-type', 'x-user-id', 'accept'];

  for (const header of headersToForward) {
    if (incomingHeaders[header]) {
      safeHeaders.set(header, incomingHeaders[header]);
    }
  }

  return safeHeaders;
}

// Main handler
export default async function handler(req, res) {
  const { method } = req;
  const path = req.query.path ? `/${req.query.path.join('/')}` : '/';

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if endpoint is blocked
  if (isEndpointBlocked(path)) {
    return res.status(403).json({
      error: 'Endpoint forbidden',
      message: `The endpoint ${path} cannot be accessed through the fallback API`,
    });
  }

  try {
    // Build full URL to primary API
    const fullUrl = new URL(KOYEB_API + path);

    // Forward query parameters
    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'path') {
          fullUrl.searchParams.append(key, String(value));
        }
      }
    }

    // Create controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    // Build request options
    const fetchOptions = {
      method,
      headers: getSafeHeaders(req.headers),
      signal: controller.signal,
    };

    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD') {
      // Get raw body as string/buffer
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      if (body) {
        fetchOptions.body = body;
      }
    }

    // Forward request to Koyeb
    const response = await fetch(fullUrl.toString(), fetchOptions);

    clearTimeout(timeoutId);

    // Forward status code and response
    res.status(response.status);

    // Forward important headers
    const headersToForward = ['content-type', 'cache-control'];
    for (const header of headersToForward) {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    }

    // Forward response body
    const body = await response.text();
    return res.send(body);
  } catch (error) {
    // Log error for debugging
    console.error('[Fallback API Error]', {
      path,
      method: req.method,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // Return error response
    res.status(503).json({
      error: 'Service unavailable',
      message: 'Could not proxy request to primary API',
      fallbackMessage:
        'Both primary and fallback APIs are currently unavailable. Please try again later.',
    });
  }
}
