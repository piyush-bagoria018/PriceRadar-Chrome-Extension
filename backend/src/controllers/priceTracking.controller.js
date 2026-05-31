import ExternalProduct from '../models/externalProduct.model.js';
import ExternalAlert from '../models/externalAlert.model.js';
import { calculateExternalDropProbability } from '../utils/externalDropProbability.js';
import { generatePriceAnalysis } from '../utils/priceAnalysis.js';
import { syncProductPrice } from '../utils/priceSync.js';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sendAlertConfirmationEmail } from '../services/email.service.js';

const AI_CACHE_TTL_MS = 60 * 60 * 1000;

const buildExternalAnalysisPayload = (product) => ({
  verdict: product.aiCache?.analysis?.verdict || '',
  dropProbability: Number(product.aiCache?.analysis?.dropProbability || 0),
  mlReason: product.aiCache?.analysis?.mlReason || `${Math.round(Number(product.aiCache?.analysis?.dropProbability || 0))}% drop probability`,
  aiExplanation: product.aiCache?.explanation || '',
  aiConfidence: product.aiCache?.confidence || 'low',
  fairRange: {
    low: Number(product.aiCache?.analysis?.fairRange?.low || 0),
    high: Number(product.aiCache?.analysis?.fairRange?.high || 0),
  },
  currentPrice: Number(product.currentPrice || 0),
  priceHistory: product.priceHistory || [],
  platform: product.platform,
  name: product.name,
});

export const trackExternalProduct = asyncHandler(async (req, res) => {
  const { identifier, name, currentPrice, platform, productUrl, imageUrl } = req.body;

  if (!identifier || !name || currentPrice === undefined || !platform || !productUrl) {
    throw new ApiError(400, 'identifier, name, currentPrice, platform, and productUrl are required');
  }

  const parsedCurrentPrice = Number(currentPrice);
  if (!Number.isFinite(parsedCurrentPrice) || parsedCurrentPrice <= 0) {
    throw new ApiError(400, 'currentPrice must be a valid number greater than 0');
  }

  let product = await ExternalProduct.findOne({ identifier });
  const now = new Date();

  if (!product) {
    product = new ExternalProduct({
      identifier,
      name,
      currentPrice: parsedCurrentPrice,
      platform,
      productUrl,
      imageUrl: imageUrl || '',
      priceHistory: [{ date: now, price: parsedCurrentPrice }],
      userLastVisitedAt: now,
    });

    await product.save();

    return res
      .status(201)
      .json(new ApiResponse(201, product, 'External product tracking started'));
  }

  product.name = name;
  product.platform = platform;
  product.productUrl = productUrl;
  if (typeof imageUrl === 'string') {
    product.imageUrl = imageUrl;
  }

  product.price = Number(product.currentPrice || 0);
  const normalizedPrice = syncProductPrice(product, parsedCurrentPrice);
  product.currentPrice = normalizedPrice;
  product.userLastVisitedAt = now;

  await product.save();

  return res
    .status(200)
    .json(new ApiResponse(200, product, 'External product updated successfully'));
});

export const getExternalAnalysis = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  const product = await ExternalProduct.findOne({ identifier });
  if (!product) {
    throw new ApiError(404, 'Product not tracked yet. Visit the product page first.');
  }

  const cachedAt = product.aiCache?.cachedAt ? new Date(product.aiCache.cachedAt).getTime() : null;
  const hasFreshCache = cachedAt && Date.now() - cachedAt < AI_CACHE_TTL_MS;
  const hasValidCache =
    hasFreshCache
    && product.aiCache?.analysis?.verdict
    && Number.isFinite(product.aiCache?.analysis?.dropProbability);

  if (hasValidCache) {
    return res
      .status(200)
      .json(new ApiResponse(200, buildExternalAnalysisPayload(product), 'External analysis fetched from cache'));
  }

  const historyEntries = Array.isArray(product.priceHistory) ? product.priceHistory : [];
  if (!historyEntries.length) {
    throw new ApiError(400, 'Insufficient price history for analysis');
  }

  const prices = historyEntries
    .map((entry) => Number(entry?.price))
    .filter((price) => Number.isFinite(price));

  if (!prices.length) {
    throw new ApiError(400, 'Insufficient price history for analysis');
  }

  const highest = Math.max(...prices);
  const lowest = Math.min(...prices);
  const average = prices.reduce((sum, value) => sum + value, 0) / prices.length;
  const recentPrices = prices.slice(-7);
  const currentPrice = Number(product.currentPrice);
  const dropProbability = calculateExternalDropProbability(historyEntries, currentPrice);
  const percentBelowAverage = average ? ((average - currentPrice) / average) * 100 : 0;

  // If history is very short, treat analysis as low-confidence and return 'Not Ideal'
  if (prices.length < 7) {
    const verdict = 'Not Ideal';
      const aiResult = await generatePriceAnalysis({
        productId: product.identifier,
        productName: product.name,
        currentPrice: product.currentPrice,
        averagePrice: average,
        lowestPrice: lowest,
        highestPrice: highest,
        dropProbability: 0,
        verdict,
        recentPrices,
        historyDays: prices.length,
      });

    product.aiCache = {
      explanation: aiResult.explanation || '',
      confidence: aiResult.confidence || 'low',
      cachedAt: new Date(),
      analysis: {
        verdict,
        dropProbability: 0,
        mlReason: 'Insufficient history',
        fairRange: {
          low: lowest,
          high: highest,
        },
        currentPrice: Number(product.currentPrice || 0),
      },
    };

    await product.save();

    return res
      .status(200)
      .json(new ApiResponse(200, buildExternalAnalysisPayload(product), 'External analysis generated (low-confidence - limited history)'));
  }

  let verdict;

  if (dropProbability > 60 && percentBelowAverage > 5) {
    verdict = 'Buy Now';
  } else if (dropProbability > 40 && percentBelowAverage > 0) {
    verdict = 'Good Time';
  } else if (dropProbability > 20) {
    verdict = 'Wait';
  } else {
    verdict = 'Not Ideal';
  }

  const aiResult = await generatePriceAnalysis({
    productId: product.identifier,
    productName: product.name,
    currentPrice: product.currentPrice,
    averagePrice: average,
    lowestPrice: lowest,
    highestPrice: highest,
    dropProbability,
    verdict,
    recentPrices,
    historyDays: prices.length,
  });

  product.aiCache = {
    explanation: aiResult.explanation || '',
    confidence: aiResult.confidence || 'low',
    cachedAt: new Date(),
    analysis: {
      verdict,
      dropProbability: Math.round(dropProbability),
      mlReason: `${Math.round(dropProbability)}% drop probability`,
      fairRange: {
        low: lowest,
        high: highest,
      },
      currentPrice: Number(product.currentPrice || 0),
    },
  };

  await product.save();

  return res
    .status(200)
    .json(new ApiResponse(200, buildExternalAnalysisPayload(product), 'External analysis generated successfully'));
});

export const getExternalHistory = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  const product = await ExternalProduct.findOne({ identifier });
  if (!product) {
    throw new ApiError(404, 'Product not tracked yet');
  }

  const historyEntries = Array.isArray(product.priceHistory) ? product.priceHistory : [];
  if (!historyEntries.length) {
    throw new ApiError(400, 'Price history not available');
  }

  const history = historyEntries
    .map((entry) => ({
      date: entry?.date,
      price: Number(entry?.price),
    }))
    .filter((entry) => Number.isFinite(entry.price));

  if (!history.length) {
    throw new ApiError(400, 'Price history not available');
  }

  const highestPrice = Math.max(...history.map((entry) => entry.price));
  const lowestPrice = Math.min(...history.map((entry) => entry.price));
  const averagePrice = history.reduce((sum, entry) => sum + entry.price, 0) / history.length;

  const result = {
    history,
    highest_price: highestPrice,
    lowest_price: lowestPrice,
    average_price: averagePrice,
    current_price: Number(product.currentPrice || history[history.length - 1].price),
    platform: product.platform,
    name: product.name,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, 'External price history fetched successfully'));
});

export const createExternalAlert = asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const { userEmail, targetPrice } = req.body;

  const product = await ExternalProduct.findOne({ identifier });
  if (!product) {
    throw new ApiError(404, 'Product not tracked yet');
  }

  if (!userEmail || targetPrice === undefined) {
    throw new ApiError(400, 'userEmail and targetPrice are required');
  }

  const parsedTargetPrice = Number(targetPrice);
  if (!Number.isFinite(parsedTargetPrice) || parsedTargetPrice <= 0) {
    throw new ApiError(400, 'targetPrice must be a valid number greater than 0');
  }

  const normalizedEmail = String(userEmail).trim().toLowerCase();

  const existingAlert = await ExternalAlert.findOne({ identifier, userEmail: normalizedEmail });
  if (existingAlert) {
    throw new ApiError(409, 'You already set an alert for this email on this product.');
  }

  const alert = await ExternalAlert.create({
    identifier,
    platform: product.platform,
    userEmail: normalizedEmail,
    targetPrice: parsedTargetPrice,
    productName: product.name,
    productUrl: product.productUrl || '',
  });

  try {
    await sendAlertConfirmationEmail({
      userEmail: normalizedEmail,
      productName: product.name,
      targetPrice: parsedTargetPrice,
    });
  } catch (emailError) {
    console.warn('[ALERT] Confirmation email failed:', emailError.message);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, alert, 'External alert created successfully'));
});

export const getExternalAlerts = asyncHandler(async (req, res) => {
  const { userEmail } = req.query;

  if (!userEmail) {
    throw new ApiError(400, 'userEmail query parameter is required');
  }

  const normalizedEmail = String(userEmail).trim().toLowerCase();

  const alerts = await ExternalAlert.find({
    userEmail: normalizedEmail,
    notified: false,
  }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, alerts, 'External alerts fetched successfully'));
});
