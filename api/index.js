let cachedApp;

export default async function handler(req, res) {
	try {
		if (!cachedApp) {
			const module = await import('../server.js');
			cachedApp = module.default;
		}

		return cachedApp(req, res);
	} catch (error) {
		console.error('Server initialization error:', error);
		return res.status(500).json({
			message: 'Server initialization failed',
			error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
		});
	}
}