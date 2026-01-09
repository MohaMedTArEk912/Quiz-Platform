import app from '../server/index.js';

// Export an explicit Vercel serverless function handler.
// (Keeping this wrapper makes it easier to catch unexpected top-level failures.)
export default function handler(req, res) {
	try {
		return app(req, res);
	} catch (error) {
		console.error('❌ Vercel handler error:', error);
		return res.status(500).json({
			message: 'Server error',
			error: error?.message || String(error)
		});
	}
}
