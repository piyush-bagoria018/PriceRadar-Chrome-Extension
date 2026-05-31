function safeFloat(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function percentDiff(currentValue, baseValue) {
  const base = Math.max(Math.abs(baseValue), 1.0);
  return ((currentValue - baseValue) / base) * 100;
}

function clamp(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function buildFeatureVector(previousPrices, currentPrice) {
  const historyWindow = previousPrices.length ? previousPrices.slice(-7) : [currentPrice];

  const averagePrice = historyWindow.reduce((sum, price) => sum + price, 0) / historyWindow.length;
  const minPrice = Math.min(...historyWindow);
  const maxPrice = Math.max(...historyWindow);

  const trend = historyWindow.length >= 3 ? historyWindow[historyWindow.length - 1] - historyWindow[historyWindow.length - 3] : 0;

  const volatility = historyWindow.length >= 2
    ? Math.sqrt(
        historyWindow.reduce((sum, price) => sum + ((price - averagePrice) ** 2), 0) / historyWindow.length
      )
    : 0;

  return {
    priceVsAverage: percentDiff(currentPrice, averagePrice),
    priceVsLow: percentDiff(currentPrice, minPrice),
    priceVsHigh: percentDiff(currentPrice, maxPrice),
    trend,
    volatility,
  };
}

function fallbackProbability(features) {
  let score = 50;
  score -= 0.75 * features.priceVsAverage;
  score -= 0.30 * features.trend;
  score += 0.15 * features.volatility;
  return clamp(score, 5, 95);
}

export function calculateExternalDropProbability(priceHistory, currentPrice) {
  if (!Array.isArray(priceHistory) || priceHistory.length < 2) {
    return 50;
  }

  const historyPrices = priceHistory
    .map((entry) => safeFloat(entry?.price))
    .filter((price) => Number.isFinite(price));

  if (historyPrices.length < 2) {
    return 50;
  }

  const safeCurrentPrice = safeFloat(currentPrice, historyPrices[historyPrices.length - 1]);
  const features = buildFeatureVector(historyPrices, safeCurrentPrice);

  return Math.round(fallbackProbability(features));
}
