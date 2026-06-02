// Content script utility functions (global scope, no ES modules)

function isAmazonProductPage() {
  return window.location.hostname.includes('amazon.in') &&
    /\/dp\/[A-Z0-9]+/.test(window.location.pathname);
}

function isFlipkartProductPage() {
  return window.location.hostname.includes('flipkart.com') &&
    (window.location.pathname.includes('/p/') ||
     new URLSearchParams(window.location.search).has('pid'));
}

function extractAmazon() {
  // Get identifier from URL
  const identifier = window.location.pathname.match(/\/dp\/([A-Z0-9]+)/)?.[1];
  if (!identifier) return null;

  // Get product name
  const name = document.querySelector('#productTitle')?.innerText?.trim();
  if (!name) return null;

  // Get price - try modern selectors first
  // Modern Amazon uses data attributes and different class structure
  const priceSelectors = [
    'span[data-a-color="price"]',           // Primary price element
    'span.a-price-whole',                   // Fallback old format
    '#priceblock_ourprice',                 // Fallback old format
    'span.a-price span.a-price-whole',      // Nested format
    'div[data-a-price-type="price"] span',  // Alternative modern format
    '.a-offscreen',                         // Last resort
  ];
  let price = null;
  
  for (const selector of priceSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (!element.innerText) continue;
      
      const text = element.innerText.trim();
      const cleaned = parseFloat(text.replace(/[^0-9.]/g, ''));
      
      // Only accept prices >= 100 (avoid "Qty: 1" or other noise)
      if (!isNaN(cleaned) && cleaned >= 100) {
        price = cleaned;
        break;
      }
    }
    if (price !== null) break;
  }
  
  if (price === null) {
    return null;
  }

  // Get image URL
  const imageUrl = document.querySelector('#landingImage')?.src || '';

  // Get product URL
  const productUrl = window.location.origin + window.location.pathname;

  return {
    identifier,
    name,
    currentPrice: price,
    platform: 'amazon',
    productUrl,
    imageUrl
  };
}

function extractFlipkart() {
  // Get product ID from URL params or pathname
  const searchParams = new URLSearchParams(window.location.search);
  let pid = searchParams.get('pid');
  
  if (!pid) {
    pid = window.location.pathname.match(/\/p\/([a-zA-Z0-9]+)/)?.[1];
  }
  
  if (!pid) {
    return null;
  }

  // Get product name - try multiple selectors
  const nameSelectors = ['[class*="ProdTitle"]', 'h1', '[class*="Xep4bb"]', '.B_NuCI'];
  let name = null;
  
  for (const selector of nameSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText && element.innerText.length > 5) {
      name = element.innerText.trim();
      if (name.length > 20) break; // Found a reasonable name
    }
  }
  
  if (!name) {
    return null;
  }

  let price = null;

  const bodyText = document.body?.innerText?.replace(/\s+/g, ' ') || '';
  if (!price) {
    const titleIndex = bodyText.indexOf(name);
    const searchText = titleIndex >= 0 ? bodyText.slice(titleIndex) : bodyText;
    const cutPoints = [
      'Buy at',
      'Protect Promise Fee',
      'Lowest price for you',
      'Apply offers for maximum savings',
    ];

    let cutIndex = searchText.length;
    for (const cutPoint of cutPoints) {
      const index = searchText.indexOf(cutPoint);
      if (index >= 0 && index < cutIndex) {
        cutIndex = index;
      }
    }

    const priceBlock = searchText.slice(0, cutIndex);
    const priceMatches = priceBlock.match(/₹\s?[\d,]+(?:\.\d+)?/g) || [];
    const priceCandidates = priceMatches
      .map((value) => Number(value.replace(/[^0-9.]/g, '')))
      .filter((value) => Number.isFinite(value) && value >= 100);

    if (priceCandidates.length) {
      price = priceCandidates[0];
    }
  }

  // Keep selector-based extraction as a backup for older layouts.
  if (price === null) {
    const priceSelectors = [
      '[class*="ProdPrice"]',
      'div[class*="_30jeq3"]',
      'div[class*="CEmiEU"]',
      'div span[class*="Nx9bqj"]',
      '[aria-label*="₹"]',
    ];

    for (const selector of priceSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (!element.innerText) continue;

          const text = element.innerText.trim();
          const cleaned = parseFloat(text.replace(/[^0-9.]/g, ''));

          // Only accept prices >= 100
          if (!isNaN(cleaned) && cleaned >= 100) {
            price = cleaned;
            break;
          }
        }
        if (price !== null) break;
      } catch (e) {
        continue;
      }
    }
  }
  
  if (price === null) {
    return null;
  }

  // Get image URL
  const imageUrl = document.querySelector('._396cs4 img, .CXW8mj img')?.src || '';

  // Get product URL
  const productUrl = window.location.origin + window.location.pathname;

  return {
    identifier: pid,
    name,
    currentPrice: price,
    platform: 'flipkart',
    productUrl,
    imageUrl
  };
}
