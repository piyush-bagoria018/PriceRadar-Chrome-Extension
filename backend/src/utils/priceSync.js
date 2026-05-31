import { ApiError } from './ApiError.js';

export const normalizePrice = (value, fieldName = 'price') => {
  const parsedPrice = Number(value);

  if (Number.isNaN(parsedPrice)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  if (parsedPrice < 0) {
    throw new ApiError(400, `${fieldName} must be greater than or equal to 0`);
  }

  return parsedPrice;
};

export const syncProductPrice = (product, nextPrice) => {
  const normalizedPrice = normalizePrice(nextPrice, 'price');

  if (!Array.isArray(product.priceHistory)) {
    product.priceHistory = [];
  }

  const now = new Date();
  const lastEntry = product.priceHistory.length ? product.priceHistory[product.priceHistory.length - 1] : null;

  // Helper: check if last entry is from the same calendar day (local time)
  const isSameDay = (dateA, dateB) => {
    if (!dateA || !dateB) return false;
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  };

  // Push a new daily snapshot if:
  // - there is no previous entry, OR
  // - the last entry is from a previous day, OR
  // - the price actually changed (intra-day update)
  const lastPrice = lastEntry ? Number(lastEntry.price) : null;
  if (!lastEntry || !isSameDay(new Date(lastEntry.date), now) || Number(lastPrice) !== normalizedPrice) {
    product.priceHistory.push({ date: now, price: normalizedPrice });
  }

  product.price = normalizedPrice;

  // Enforce rolling 90-day window
  while (product.priceHistory.length > 90) {
    product.priceHistory.shift();
  }

  return normalizedPrice;
};
