import cron from 'node-cron';
import ExternalAlert from '../models/externalAlert.model.js';
import ExternalProduct from '../models/externalProduct.model.js';
import { sendPriceAlertEmail } from './email.service.js';

let alertSchedulerTask = null;

export const startAlertScheduler = () => {
  if (alertSchedulerTask) {
    return;
  }

  alertSchedulerTask = cron.schedule('0 * * * *', async () => {
    console.log('[ALERT SCHEDULER] Running hourly alert check');

    try {
      const pendingAlerts = await ExternalAlert.find({ notified: false });

      for (const alert of pendingAlerts) {
        try {
          const product = await ExternalProduct.findOne({ identifier: alert.identifier });

          if (!product) {
            console.warn(`[ALERT SCHEDULER] Product not found for identifier ${alert.identifier}`);
            continue;
          }

          if (Number(product.currentPrice) <= Number(alert.targetPrice)) {
            await sendPriceAlertEmail({
              userEmail: alert.userEmail,
              productName: alert.productName,
              targetPrice: alert.targetPrice,
              currentPrice: product.currentPrice,
              productUrl: alert.productUrl || product.productUrl || '',
            });

            alert.notified = true;
            alert.notifiedAt = new Date();
            await alert.save();

            console.log(`[ALERT SCHEDULER] Alert sent to ${alert.userEmail} for ${alert.productName}`);
          }
        } catch (alertError) {
          console.error(
            `[ALERT SCHEDULER] Failed processing alert ${alert._id}:`,
            alertError.message
          );
          continue;
        }
      }
    } catch (err) {
      console.error('[ALERT SCHEDULER] Failed hourly run:', err.message);
    }
  });
};

export const stopAlertScheduler = () => {
  if (alertSchedulerTask) {
    alertSchedulerTask.stop();
    alertSchedulerTask = null;
  }
};
