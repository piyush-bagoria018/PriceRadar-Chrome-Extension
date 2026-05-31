import dotenv from 'dotenv';
dotenv.config();

import connectDB from './src/db/index.js';
import app from './app.js';
import { startAlertScheduler, stopAlertScheduler } from './src/services/alertScheduler.service.js';
import { startPriceUpdateScheduler, stopPriceUpdateScheduler } from './src/services/priceUpdateScheduler.service.js';

const PORT = process.env.PORT || 5000;

const boot = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`PriceRadar backend running on port ${PORT}`);
    startAlertScheduler();
    console.log('Alert scheduler started');
    startPriceUpdateScheduler();
    console.log('Price update scheduler started');
  });

  // Graceful shutdown: when server restarts, stop schedulers cleanly
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    stopAlertScheduler();
    stopPriceUpdateScheduler();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
};

boot().catch((err) => {
  console.error('Failed to start PriceRadar backend', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  process.exit(0);
});
