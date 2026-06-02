// Content script - extracts product data and communicates with background service worker
// Runs on Amazon and Flipkart product pages

;(function() {
  let lastTrackedIdentifier = null;
  let lastTrackedUrl = window.location.href;
  let lastPrefetchedIdentifier = null;

  // Helper to create/update badge
  function ensureBadgeExists() {
    let badge = document.getElementById('priceradar-badge');
    if (badge) return badge;

    badge = document.createElement('div');
    badge.id = 'priceradar-badge';
    badge.style.position = 'fixed';
    badge.style.bottom = '24px';
    badge.style.right = '24px';
    badge.style.zIndex = '999999';
    badge.style.background = '#1e1e1e';
    badge.style.border = '1px solid #5dcaa5';
    badge.style.color = '#f6f3ec';
    badge.style.borderRadius = '99px';
    badge.style.padding = '8px 16px';
    badge.style.fontSize = '12px';
    badge.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    badge.style.cursor = 'pointer';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '6px';
    badge.innerHTML = '<span style="width:6px;height:6px;border-radius:999px;background:#5dcaa5;display:inline-block;"></span><span>PriceRadar</span>';
    badge.setAttribute('role', 'button');
    badge.setAttribute('aria-label', 'Open PriceRadar popup');
    badge.tabIndex = 0;

    // Click handler to open popup
    badge.addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({ action: 'OPEN_POPUP' }, (resp) => {
          if (chrome.runtime.lastError) {
            console.error('[PriceRadar] OPEN_POPUP message error:', chrome.runtime.lastError);
          }
        });
      } catch (err) {
        console.error('[PriceRadar] Failed to request OPEN_POPUP:', err);
      }
    });

    // Keyboard activation
    badge.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        badge.click();
      }
    });

    document.body.appendChild(badge);
    return badge;
  }

  // Core function: extract and track product
  function trackCurrentProduct() {
    try {
      let productData = null;

      if (isAmazonProductPage()) {
        productData = extractAmazon();
      } else if (isFlipkartProductPage()) {
        productData = extractFlipkart();
      }

      if (!productData || !productData.identifier) {
        return;
      }

      // Skip if we already tracked this exact product
      if (lastTrackedIdentifier === productData.identifier) {
        return;
      }

      lastTrackedIdentifier = productData.identifier;

      // Store locally for popup
      chrome.storage.local.set({
        currentProduct: {
          identifier: productData.identifier,
          platform: productData.platform,
          name: productData.name,
          currentPrice: productData.currentPrice,
          trackedAt: Date.now(),
        },
      });

      // Send to background to track in backend
      chrome.runtime.sendMessage(
        { action: 'TRACK_PRODUCT', productData },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[PriceRadar] Message error:', chrome.runtime.lastError);
            return;
          }

          if (response && response.success) {
            ensureBadgeExists();

            if (lastPrefetchedIdentifier !== productData.identifier) {
              lastPrefetchedIdentifier = productData.identifier;
              chrome.runtime.sendMessage(
                { action: 'GET_ANALYSIS', identifier: productData.identifier },
                () => {}
              );
            }
          }
        }
      );
    } catch (e) {
      console.error('[PriceRadar] Error in trackCurrentProduct:', e);
    }
  }

  // Initial track on script load
  try {
    trackCurrentProduct();
  } catch (e) {
    console.error('[PriceRadar] Initial track failed:', e);
  }

  // Listen for same-page navigation (Flipkart uses pushState/popstate for product changes)
  window.addEventListener('popstate', () => {
    trackCurrentProduct();
  });

  window.addEventListener('hashchange', () => {
    trackCurrentProduct();
  });

  // Fallback: detect URL changes via polling (for SPA navigation that doesn't emit popstate/hashchange)
  let pollInterval = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastTrackedUrl) {
      lastTrackedUrl = currentUrl;
      trackCurrentProduct();
    }
  }, 1500); // Check every 1.5 seconds

  // Clean up on unload
  window.addEventListener('beforeunload', () => {
    clearInterval(pollInterval);
  });
})();
