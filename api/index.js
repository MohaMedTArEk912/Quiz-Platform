import app from '../server/index.js';

// Export the Express app as a Vercel serverless function handler
export default async (req, res) => {
  // Let Express handle the request
  return app(req, res);
};
