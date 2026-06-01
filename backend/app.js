import express from 'express';
import cors from 'cors';
import priceTrackingRouter from './src/routes/priceTracking.routes.js';
import { ApiError } from './src/utils/ApiError.js';

const app = express();

app.use(cors({
	origin: function (origin, callback) {
		// origin can be undefined for some requests (e.g. curl), guard startsWith calls
		const isChromeExtension = !origin || (origin && origin.startsWith('chrome-extension://'));
		const isLocalhost =
			process.env.NODE_ENV === 'development'
			&& (
				(origin && origin.startsWith('http://localhost'))
				|| (origin && origin.startsWith('http://127.0.0.1'))
			);

		// Chrome extension in all environments, localhost only in development
		if (isChromeExtension || isLocalhost) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: true,
}));

app.use(express.json());

// Health check endpoint (for monitoring and load balancer)
app.get('/health', (req, res) => {
	res.status(200).json({
		status: 'ok',
		uptime: process.uptime(),
	});
});

app.use('/api/v1/price-tracking', priceTrackingRouter);

app.use((err, req, res, next) => {
	if (err instanceof ApiError) {
		return res.status(err.statuscode).json({
			statuscode: err.statuscode,
			data: err.data,
			message: err.message,
			success: err.success,
			errors: err.errors,
		});
	}

	return res.status(500).json({
		statuscode: 500,
		data: null,
		message: err?.message || 'Internal Server Error',
		success: false,
		errors: [],
	});
});

export default app;
