import cron from 'node-cron';
import axios from 'axios';
import * as cheerio from 'cheerio';
import ExternalProduct from '../models/externalProduct.model.js';
import { syncProductPrice } from '../utils/priceSync.js';

let priceUpdateSchedulerTask = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractPriceBySelectors = ($, selectors) => {
  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      return text;
    }
  }

  return '';
};

const parsePriceText = (priceText) => {
  const cleaned = (priceText || '').replace(/[^0-9.]/g, '');
  return parseFloat(cleaned);
};

export const updatePricesNow = async () => {
  const products = await ExternalProduct.find({});
  if (!products.length) {
    return;
  }

  for (const product of products) {
    try {
      if (!process.env.SCRAPERAPI_KEY) {
        console.warn('[PRICE UPDATE SCHEDULER] SCRAPERAPI_KEY missing, skipping updates');
        return;
      }

      const url = `http://api.scraperapi.com?api_key=${process.env.SCRAPERAPI_KEY}&url=${encodeURIComponent(product.productUrl)}&country_code=in`;
      const response = await axios.get(url, { timeout: 15000 });
      const $ = cheerio.load(response.data);

      let priceText = '';

      if (product.platform === 'amazon') {
        priceText = extractPriceBySelectors($, [
          '.a-price-whole',
          '#priceblock_ourprice',
          '#priceblock_dealprice',
          '.a-offscreen',
        ]);
      } else if (product.platform === 'flipkart') {
        priceText = extractPriceBySelectors($, [
          '._30jeq3',
          '._16Jk6d',
          '.Nx9bqj',
        ]);
      }

      const price = parsePriceText(priceText);

      if (Number.isFinite(price) && price > 0) {
        product.price = Number(product.currentPrice || 0);
        const updatedPrice = syncProductPrice(product, price);
        product.currentPrice = updatedPrice;
        product.lastScrapedAt = new Date();
        await product.save();
      } else {
        console.warn(`[PRICE UPDATE SCHEDULER] Price not found for ${product.name}`);
      }
    } catch (productError) {
      console.error(
        `[PRICE UPDATE SCHEDULER] Failed for ${product.name}:`,
        productError.message
      );
      continue;
    }

    await delay(2000);
  }
};

export const startPriceUpdateScheduler = () => {
  if (priceUpdateSchedulerTask) {
    return;
  }

  priceUpdateSchedulerTask = cron.schedule('0 2 * * *', async () => {
    try {
      await updatePricesNow();
    } catch (err) {
      console.error('[PRICE UPDATE SCHEDULER] Daily run failed:', err.message);
    }
  });
};

export const stopPriceUpdateScheduler = () => {
  if (priceUpdateSchedulerTask) {
    priceUpdateSchedulerTask.stop();
    priceUpdateSchedulerTask = null;
  }
};
