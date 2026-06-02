// Background service worker - handles messaging between content script, popup, and backend

const BACKEND_URL = 'https://priceradar-q33vr.ondigitalocean.app';
// Change to deployed URL before publishing

// Helper function to make fetch calls with timeout and retries
async function fetchWithTimeout(url, options = {}, { timeoutMs = 15000, attempts = 3 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response;
    } catch (err) {
      clearTimeout(timeout);
      // If last attempt, rethrow to be handled by caller
      if (attempt === attempts - 1) throw err;
      // Small backoff before retrying
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
}

async function readBackendErrorMessage(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload?.message || payload?.error || fallbackMessage;
  } catch (error) {
    return fallbackMessage;
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OPEN_POPUP') {
    try {
      // Chrome-only: open the action popup using the modern API
      if (chrome.action && typeof chrome.action.openPopup === 'function') {
        chrome.action.openPopup(() => {});
        sendResponse({ success: true });
        return true;
      }

      // If `chrome.action.openPopup` is not available, return an explicit error
      sendResponse({ success: false, error: 'openPopup not supported in this browser' });
      return true;
    } catch (err) {
      console.error('[PriceRadar Background] OPEN_POPUP failed:', err);
      sendResponse({ success: false, error: String(err) });
      return true;
    }
  }
  if (message.action === 'TRACK_PRODUCT') {
    handleTrackProduct(message, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === 'GET_ANALYSIS') {
    handleGetAnalysis(message, sendResponse);
    return true;
  }

  if (message.action === 'CREATE_ALERT') {
    handleCreateAlert(message, sendResponse);
    return true;
  }
});

// Handle TRACK_PRODUCT message
async function handleTrackProduct(message, sendResponse) {
  try {
    const { productData } = message;

    const response = await fetchWithTimeout(
      `${BACKEND_URL}/api/v1/price-tracking/track`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      }
    );

    if (!response.ok) {
      const errorMessage = await readBackendErrorMessage(response, `Backend error: ${response.status}`);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('[PriceRadar Background] TRACK_PRODUCT failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle GET_ANALYSIS message
async function handleGetAnalysis(message, sendResponse) {
  try {
    const { identifier } = message;

    const response = await fetchWithTimeout(
      `${BACKEND_URL}/api/v1/price-tracking/${identifier}/analysis`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const errorMessage = await readBackendErrorMessage(response, `Backend error: ${response.status}`);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    sendResponse({ success: true, data });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle CREATE_ALERT message
async function handleCreateAlert(message, sendResponse) {
  try {
    const { identifier, userEmail, targetPrice } = message;

    const response = await fetchWithTimeout(
      `${BACKEND_URL}/api/v1/price-tracking/${identifier}/alert`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, targetPrice }),
      }
    );

    if (!response.ok) {
      const errorMessage = await readBackendErrorMessage(response, `Backend error: ${response.status}`);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    sendResponse({ success: true, data });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
