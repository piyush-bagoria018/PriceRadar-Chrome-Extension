let currentChart = null;
let currentAnalysisData = null;
let currentProductInfo = null;
let isAlertFormLocked = false;

function isAmazonProductPage(url) {
  return url.hostname.includes('amazon.in') && /\/dp\/[A-Z0-9]+/.test(url.pathname);
}

function isFlipkartProductPage(url) {
  return url.hostname.includes('flipkart.com') &&
    (url.pathname.includes('/p/') || url.searchParams.has('pid'));
}

function getIdentifierFromUrl(url) {
  if (isAmazonProductPage(url)) {
    return url.pathname.match(/\/dp\/([A-Z0-9]+)/)?.[1] || null;
  }

  if (isFlipkartProductPage(url)) {
    return url.searchParams.get('pid') || url.pathname.match(/\/p\/([a-zA-Z0-9]+)/)?.[1] || null;
  }

  return null;
}

function formatPrice(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 'Rs --';
  }

  return `Rs ${parsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function truncateText(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function setAnalysisLoading() {
  const aiAnalysis = document.querySelector('#ai-analysis');
  const aiExplanation = document.querySelector('#ai-explanation');

  if (aiAnalysis) {
    aiAnalysis.dataset.state = 'loading';
  }

  if (aiExplanation) {
    aiExplanation.textContent = 'Loading AI insight...';
  }
}

function populateShellFromProduct(data) {
  currentProductInfo = {
    identifier: data?.identifier || currentProductInfo?.identifier || '',
    platform: data?.platform || currentProductInfo?.platform || '',
    currentPrice: Number(data?.currentPrice || currentProductInfo?.currentPrice || 0),
  };

  const productName = document.querySelector('#product-name');
  const currentPrice = document.querySelector('#current-price');
  const statLow = document.querySelector('#stat-low .stat-value');
  const statAvg = document.querySelector('#stat-avg .stat-value');
  const statHigh = document.querySelector('#stat-high .stat-value');
  const alertPrice = document.querySelector('#alert-price');

  if (productName) {
    productName.textContent = truncateText(data?.name || '', 60);
  }

  if (currentPrice) {
    currentPrice.textContent = formatPrice(data?.currentPrice);
  }

  if (statLow) {
    statLow.textContent = 'Rs --';
  }

  if (statAvg) {
    statAvg.textContent = 'Rs --';
  }

  if (statHigh) {
    statHigh.textContent = 'Rs --';
  }

  setVerdictBadge('');
  setPlatformBadge(data?.platform);
  setAnalysisLoading();

  if (alertPrice) {
    alertPrice.value = Number(data?.currentPrice || 0) ? String(data.currentPrice) : '';
  }
}

function showOnlyMainSections(visibleSelectors) {
  const mainSelectors = [
    '#header',
    '#product-name',
    '#price-section',
    '#ai-analysis',
    '#stats-row',
    '#chart-section',
    '#alert-section',
    '#footer',
  ];

  mainSelectors.forEach((selector) => {
    const element = document.querySelector(selector);
    if (!element) return;
    element.style.display = visibleSelectors.includes(selector) ? '' : 'none';
  });
}

function hideAllStateDivs() {
  ['#state-loading', '#state-not-product', '#state-first-visit', '#state-error'].forEach((selector) => {
    const element = document.querySelector(selector);
    if (!element) return;
    element.classList.remove('active');
    element.style.display = 'none';
  });
}

function setStateVisibility(stateName) {
  hideAllStateDivs();

  const loading = document.querySelector('#state-loading');
  const notProduct = document.querySelector('#state-not-product');
  const firstVisit = document.querySelector('#state-first-visit');
  const errorState = document.querySelector('#state-error');

  if (stateName === 'loading' && loading) {
    loading.classList.add('active');
    loading.style.display = 'flex';
    return;
  }

  if (stateName === 'not-product' && notProduct) {
    notProduct.classList.add('active');
    notProduct.style.display = 'block';
    return;
  }

  if (stateName === 'first-visit' && firstVisit) {
    firstVisit.classList.add('active');
    firstVisit.style.display = 'block';
    return;
  }

  if (stateName === 'error' && errorState) {
    errorState.classList.add('active');
    errorState.style.display = 'block';
  }
}

function showState(stateName, message = '') {
  const mainSelectors = [
    '#header',
    '#product-name',
    '#price-section',
    '#ai-analysis',
    '#stats-row',
    '#chart-section',
    '#alert-section',
    '#footer',
  ];

  if (stateName === 'full') {
    mainSelectors.forEach((selector) => {
      const element = document.querySelector(selector);
      if (!element) return;
      element.style.display = '';
    });
    hideAllStateDivs();
    return;
  }

  if (stateName === 'first-visit') {
    showOnlyMainSections(['#header', '#product-name', '#price-section', '#footer']);
    hideAllStateDivs();
    const firstVisit = document.querySelector('#state-first-visit');
    if (firstVisit) {
      firstVisit.classList.add('active');
      firstVisit.style.display = 'block';
    }
    return;
  }

  if (stateName === 'not-product') {
    showOnlyMainSections([]);
    hideAllStateDivs();
    const notProduct = document.querySelector('#state-not-product');
    if (notProduct) {
      notProduct.classList.add('active');
      notProduct.style.display = 'block';
    }
    return;
  }

  if (stateName === 'loading') {
    showOnlyMainSections([]);
    hideAllStateDivs();
    const loading = document.querySelector('#state-loading');
    if (loading) {
      loading.classList.add('active');
      loading.style.display = 'flex';
    }
    return;
  }

  if (stateName === 'error') {
    showOnlyMainSections([]);
    hideAllStateDivs();
    const errorState = document.querySelector('#state-error');
    const errorText = document.querySelector('#error-text');
    if (errorText) {
      errorText.textContent = message || 'Failed to load data';
    }
    if (errorState) {
      errorState.classList.add('active');
      errorState.style.display = 'block';
    }
  }
}

function getCurrentPrice() {
  const priceText = document.querySelector('#current-price')?.textContent || '';
  const parsed = parseFloat(priceText.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getHistoryStats(priceHistory) {
  const validPrices = Array.isArray(priceHistory)
    ? priceHistory.map((entry) => Number(entry?.price)).filter((price) => Number.isFinite(price))
    : [];

  if (!validPrices.length) {
    return { low: 0, avg: 0, high: 0 };
  }

  const low = Math.min(...validPrices);
  const high = Math.max(...validPrices);
  const avg = validPrices.reduce((sum, value) => sum + value, 0) / validPrices.length;

  return { low, avg, high };
}

function setVerdictBadge(verdict) {
  const badge = document.querySelector('#verdict-badge');
  if (!badge) return;

  const normalizedVerdict = String(verdict || '').trim();
  badge.className = 'verdict-badge';
  badge.textContent = normalizedVerdict || 'Unknown';

  const verdictClassMap = {
    'Buy Now': 'buy-now',
    'Good Time': 'good-time',
    Wait: 'wait',
    'Not Ideal': 'not-ideal',
  };

  const verdictClass = verdictClassMap[normalizedVerdict] || 'not-ideal';
  badge.classList.add(verdictClass);
}

function setPlatformBadge(platform) {
  const badge = document.querySelector('#platform-badge');
  if (!badge) return;

  const normalizedPlatform = String(platform || '').toLowerCase();
  // reset
  badge.className = '';
  badge.textContent = '';
  badge.removeAttribute('style');
  badge.setAttribute('aria-label', normalizedPlatform || 'Unknown platform');

  const iconMap = {
    amazon: '../icons/amazon.svg',
    flipkart: '../icons/flipkart.svg',
  };

  const src = iconMap[normalizedPlatform];
  if (src) {
    // apply platform class for background styling
    badge.classList.add(`platform-${normalizedPlatform}`);

    const img = document.createElement('img');
    img.src = src;
    img.alt = normalizedPlatform;
    img.width = 84;
    img.height = 20;
    img.style.objectFit = 'contain';
    badge.appendChild(img);
  } else {
    badge.classList.add('platform-unknown');
    badge.textContent = normalizedPlatform || 'Unknown';
    badge.style.color = 'var(--muted)';
    badge.style.backgroundColor = 'var(--card)';
    badge.style.border = '1px solid var(--border)';
    badge.style.padding = '4px 8px';
  }
}

function getPreferredRange() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['chartRange'], (res) => {
        const range = Number(res?.chartRange) || 90;
        resolve(range);
      });
    } catch (e) {
      resolve(90);
    }
  });
}

function setPreferredRange(range) {
  try {
    chrome.storage.local.set({ chartRange: Number(range) });
  } catch (e) {
    // ignore
  }
}

function updateRangeToggleUI(range) {
  const btns = document.querySelectorAll('.range-btn');
  btns.forEach((b) => {
    if (String(b.dataset.range) === String(range)) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  // Update stat labels to reflect the selected range, but fall back to observed days
  const lowLabel = document.querySelector('#stat-low .stat-label');
  const highLabel = document.querySelector('#stat-high .stat-label');
  const historyDays = (currentAnalysisData && Array.isArray(currentAnalysisData.priceHistory)) ? currentAnalysisData.priceHistory.length : 0;

  const labelFor = (requestedRange) => {
    if (historyDays >= requestedRange) return `${requestedRange}-day`;
    if (historyDays >= 2) return `Observed (${historyDays}d)`;
    return `Observed (${historyDays}d)`;
  };

  if (lowLabel) lowLabel.textContent = `${labelFor(Number(range))} Low`;
  if (highLabel) highLabel.textContent = `${labelFor(Number(range))} High`;
}

function attachRangeToggleHandler() {
  const wrap = document.getElementById('chart-range');
  if (!wrap || wrap.dataset.bound === 'true') return;
  wrap.dataset.bound = 'true';
  wrap.addEventListener('click', (ev) => {
    const btn = ev.target.closest && ev.target.closest('.range-btn');
    if (!btn) return;
    const range = Number(btn.dataset.range) || 90;
    setPreferredRange(range);
    updateRangeToggleUI(range);
    // re-render chart with selected range if we have current analysis data
    try {
      const history = (currentAnalysisData && currentAnalysisData.priceHistory) || [];
      renderChart(history, range);
    } catch (e) {
      // ignore
    }
  });
}

function populateUI(data) {
  currentAnalysisData = data;
  const aiAnalysis = document.querySelector('#ai-analysis');
  const aiExplanation = document.querySelector('#ai-explanation');
  const alertBtn = document.querySelector('#alert-btn');

  populateShellFromProduct(data);

  if (aiExplanation) {
    aiExplanation.textContent = data?.aiExplanation || data?.explanation || 'Analyzing...';
  }

  if (aiAnalysis) {
    aiAnalysis.dataset.state = 'ready';
  }

  const historyStats = getHistoryStats(data?.priceHistory || []);
  const fairRange = data?.fairRange || {};
  const historyDays = Array.isArray(data?.priceHistory) ? data.priceHistory.length : 0;

  const statLow = document.querySelector('#stat-low .stat-value');
  const statAvg = document.querySelector('#stat-avg .stat-value');
  const statHigh = document.querySelector('#stat-high .stat-value');

  if (statLow) {
    statLow.textContent = formatPrice(fairRange.low || historyStats.low);
  }

  if (statAvg) {
    statAvg.textContent = formatPrice(historyStats.avg);
  }

  if (statHigh) {
    statHigh.textContent = formatPrice(fairRange.high || historyStats.high);
  }

  // Dynamic stat labels based on available history
  try {
    const lowLabelEl = document.querySelector('#stat-low .stat-label');
    const avgLabelEl = document.querySelector('#stat-avg .stat-label');
    const highLabelEl = document.querySelector('#stat-high .stat-label');

    const metricLabel = (days) => {
      if (days >= 90) return '90-day';
      if (days >= 30) return '30-day';
      if (days >= 2) return `Observed (${days}d)`;
      if (days === 1) return `Observed (1d)`;
      return 'Observed (0d)';
    };

    if (lowLabelEl) lowLabelEl.textContent = `${metricLabel(historyDays)} Low`;
    if (avgLabelEl) avgLabelEl.textContent = `${metricLabel(historyDays)} Avg`;
    if (highLabelEl) highLabelEl.textContent = `${metricLabel(historyDays)} High`;
  } catch (e) {
    // ignore DOM update failures
  }

  setVerdictBadge(data?.verdict);
  // ensure range toggle exists and is attached
  attachRangeToggleHandler();
  getPreferredRange().then((range) => {
    updateRangeToggleUI(range);
    renderChart(data?.priceHistory || [], Number(range));

    // Hide range toggles if overall history is too small to show a chart
    try {
      const chartRangeWrap = document.getElementById('chart-range');
      const historyDaysLocal = Array.isArray(data?.priceHistory) ? data.priceHistory.length : 0;
      if (chartRangeWrap) {
        // Hide the entire control when less than 2 days of data
        chartRangeWrap.style.display = historyDaysLocal < 2 ? 'none' : '';

        // Also hide individual buttons if not enough history
        const btn30 = chartRangeWrap.querySelector('.range-btn[data-range="30"]');
        const btn90 = chartRangeWrap.querySelector('.range-btn[data-range="90"]');
        if (btn30) btn30.style.display = historyDaysLocal >= 30 ? '' : 'none';
        if (btn90) btn90.style.display = historyDaysLocal >= 90 ? '' : 'none';
      }
    } catch (e) {
      // ignore
    }
  }).catch(() => {
    renderChart(data?.priceHistory || [], 90);
  });

  if (alertBtn) {
    alertBtn.disabled = false;
    alertBtn.textContent = 'Set Alert';
  }
}

function renderChart(priceHistory, days = 90) {
  const chartSection = document.querySelector('#chart-section');
  const canvas = document.querySelector('#priceChart');

  if (!chartSection || !canvas) {
    if (chartSection) {
      chartSection.style.display = 'none';
    }
    return;
  }

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - Number(days || 90));

  const chartPoints = Array.isArray(priceHistory)
    ? priceHistory
      .map((entry) => ({
        date: entry?.date ? new Date(entry.date) : null,
        price: Number(entry?.price),
      }))
      .filter((entry) => entry.date instanceof Date && !Number.isNaN(entry.date.getTime()) && Number.isFinite(entry.price) && entry.date >= cutoff)
      .sort((a, b) => a.date - b.date)
    : [];

  if (chartPoints.length < 2) {
    if (currentChart) {
      currentChart.destroy();
      currentChart = null;
    }
    chartSection.style.display = 'none';
    return;
  }

  chartSection.style.display = '';

  const context = canvas.getContext('2d');
  if (!context || typeof Chart === 'undefined') {
    chartSection.style.display = 'none';
    return;
  }

  const labels = chartPoints.map((entry) => {
    const date = entry.date;
    return `${String(date.getDate()).padStart(2, '0')} ${date.toLocaleString('en-IN', { month: 'short' })}`;
  });
  const values = chartPoints.map((entry) => entry.price);
  const minPrice = Math.min(...values);
  const maxPrice = Math.max(...values);
  const priceRange = Math.max(maxPrice - minPrice, 1);
  const axisPadding = Math.max(Math.round(priceRange * 0.12), 50);
  const stepSize = priceRange > 20000
    ? 5000
    : priceRange > 10000
      ? 2000
      : 500;

  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  currentChart = new Chart(context, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Price',
          data: values,
          borderColor: '#5dcaa5',
          backgroundColor: 'rgba(93, 202, 165, 0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0,
          fill: true,
          pointStyle: 'circle',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          borderColor: 'rgba(255,255,255,0.12)',
          borderWidth: 1,
          titleColor: '#f6f3ec',
          bodyColor: '#f6f3ec',
          displayColors: false,
          padding: 8,
          callbacks: {
            title: (items) => (items && items[0] && items[0].label) || '',
            label: (ctx) => formatPrice(ctx.parsed ? ctx.parsed.y : ctx.raw),
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: 'rgba(247, 242, 232, 0.65)',
            maxTicksLimit: 6,
            autoSkip: true,
          },
          grid: {
            display: false,
          },
        },
        y: {
          suggestedMin: Math.max(0, minPrice - axisPadding),
          suggestedMax: maxPrice + axisPadding,
          ticks: {
            color: 'rgba(247, 242, 232, 0.65)',
            stepSize,
            callback: (value) => {
              const num = Number(value);
              if (!Number.isFinite(num)) return 'Rs --';
              if (num >= 100000) return `Rs ${(num / 100000).toFixed(1)}L`;
              return `Rs ${Math.round(num).toLocaleString('en-IN')}`;
            },
          },
          grid: {
            color: 'rgba(255,255,255,0.06)',
          },
        },
      },
    },
  });
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      resolve(response);
    });
  });
}

async function fetchAnalysisWithRetry(identifier, attempts = 3) {
  let lastResponse = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastResponse = await sendRuntimeMessage({ action: 'GET_ANALYSIS', identifier });

    if (lastResponse?.success) {
      return lastResponse;
    }

    const errorMessage = String(lastResponse?.error || '');
    if (!errorMessage.includes('404') && !errorMessage.toLowerCase().includes('not tracked')) {
      return lastResponse;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }

  // If backend repeatedly returns 404 / not tracked or timed out, fall back to locally stored product info
  try {
    if (!lastResponse || !lastResponse.success) {
      const storage = await new Promise((resolve) => chrome.storage.local.get(['currentProduct'], resolve));
      const local = storage?.currentProduct;
      if (local && String(local.identifier) === String(identifier)) {
        // Return a minimal success-shaped response so UI can show 'tracking started' state
        return {
          success: true,
          data: {
            identifier: local.identifier,
            name: local.name || '',
            platform: local.platform || '',
            currentPrice: local.currentPrice || 0,
            priceHistory: [],
          },
        };
      }
    }
  } catch (e) {
    // ignore storage errors and return lastResponse below
  }

  return lastResponse;
}

function handleAnalysisResponse(response) {
  if (!response || !response.success) {
    console.warn('[PriceRadar Popup] Analysis fetch failed:', response?.error);
    showState('error', response?.error || 'Failed to load data');
    return;
  }

  const responseData = response.data?.data || response.data || response;
  const priceHistory = responseData?.priceHistory || [];

  // Preserve product info even with limited history
  if (responseData?.identifier) {
    currentProductInfo = {
      identifier: responseData.identifier,
      platform: responseData?.platform || 'unknown',
      currentPrice: Number(responseData?.currentPrice || 0),
    };
  }

  // Always show the main UI even with limited history so users can set alerts and view available data.
  // Analysis confidence may be low with small history, but core features (alerts, chart, stats) are available from day 1.
  showState('full');

  // If history is very short, provide a gentle note in the AI explanation area but still render everything.
  if (Array.isArray(priceHistory) && priceHistory.length < 7) {
    responseData.aiExplanation = responseData.aiExplanation || 'Limited history — analysis will improve as daily snapshots accumulate.';
  }

  populateUI(responseData);
}

function processPage(url) {
  try {
    const isAmazon = url.hostname.includes('amazon.in') && /\/dp\/[A-Z0-9]+/.test(url.pathname);
    const isFlipkart = url.hostname.includes('flipkart.com') &&
      (url.pathname.includes('/p/') || url.searchParams.has('pid'));

    if (!isAmazon && !isFlipkart) {
      showState('not-product');
      return;
    }

    const identifier = isAmazon
      ? url.pathname.match(/\/dp\/([A-Z0-9]+)/)?.[1]
      : url.searchParams.get('pid') || url.pathname.match(/\/p\/([a-zA-Z0-9]+)/)?.[1];

    if (!identifier) {
      showState('error', 'Could not identify this product');
      return;
    }

    currentProductInfo = {
      identifier,
      platform: isAmazon ? 'amazon' : 'flipkart',
    };

    chrome.storage.local.get(['currentProduct'], (storage) => {
      const local = storage?.currentProduct;
      if (local && String(local.identifier) === String(identifier)) {
        populateShellFromProduct(local);
      } else {
        populateShellFromProduct(currentProductInfo);
      }

      showState('full');
      setAnalysisLoading();

      fetchAnalysisWithRetry(identifier)
        .then((response) => {
          handleAnalysisResponse(response);
        })
        .catch(() => {
          showState('error', 'Failed to load data');
        });
    });
  } catch (error) {
    showState('error', 'Failed to load data');
  }
}

function setAlertFormState(isDisabled, buttonText) {
  const emailInput = document.getElementById('alert-email');
  const priceInput = document.getElementById('alert-price');
  const alertBtn = document.getElementById('alert-btn');

  if (emailInput) {
    emailInput.disabled = isDisabled;
  }

  if (priceInput) {
    priceInput.disabled = isDisabled;
  }

  if (alertBtn) {
    alertBtn.disabled = isDisabled;
    if (buttonText) {
      alertBtn.textContent = buttonText;
    }
  }
}

function setAlertMessage(message, isError = false) {
  const aiExplanation = document.getElementById('ai-explanation');
  const aiAnalysis = document.getElementById('ai-analysis');
  if (!aiExplanation) return;

  aiExplanation.textContent = message;
  aiExplanation.style.color = isError ? '#f28b82' : 'rgba(247, 242, 232, 0.65)';
  if (aiAnalysis) {
    aiAnalysis.dataset.state = 'ready';
  }
}

function showAlertStatus(message, type = 'error') {
  const alertSection = document.getElementById('alert-section');
  if (alertSection === null) return;

  let statusDiv = alertSection.querySelector('.alert-status-inline');
  if (statusDiv === null) {
    statusDiv = document.createElement('div');
    statusDiv.className = 'alert-status-inline';
    statusDiv.style.marginTop = '8px';
    statusDiv.style.padding = '8px 12px';
    statusDiv.style.borderRadius = '4px';
    statusDiv.style.fontSize = '12px';
    statusDiv.style.textAlign = 'center';
    statusDiv.style.border = '1px solid transparent';
    alertSection.appendChild(statusDiv);
  }

  const isSuccess = type === 'success';
  statusDiv.style.display = 'block';
  statusDiv.style.backgroundColor = isSuccess ? 'rgba(93, 202, 165, 0.15)' : 'rgba(242, 139, 130, 0.15)';
  statusDiv.style.borderColor = isSuccess ? '#5dcaa5' : '#f28b82';
  statusDiv.style.color = isSuccess ? '#5dcaa5' : '#f28b82';
  statusDiv.textContent = message;
}

function clearAlertStatus() {
  const alertSection = document.getElementById('alert-section');
  if (alertSection === null) return;

  const statusDiv = alertSection.querySelector('.alert-status-inline');
  if (statusDiv) {
    statusDiv.style.display = 'none';
  }
}

function injectFloatingBadge() {
  try {
    if (document.getElementById('priceradar-badge')) return;

    const badge = document.createElement('div');
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
    document.body.appendChild(badge);
  } catch (error) {
    // Silent fail — badge should never interrupt the page
  }
}

function attachAlertHandler() {
  const alertBtn = document.getElementById('alert-btn');
  if (alertBtn === null || alertBtn.dataset.bound === 'true') return;

  alertBtn.dataset.bound = 'true';

  alertBtn.addEventListener('click', () => {
    try {
      clearAlertStatus();
      const email = document.getElementById('alert-email')?.value.trim() || '';
      const targetPrice = parseFloat(document.getElementById('alert-price')?.value);
      const currentPrice = getCurrentPrice();

      if (email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) === false) {
        showAlertStatus('Enter a valid email', 'error');
        return;
      }

      if (Number.isFinite(targetPrice) === false || targetPrice <= 0) {
        showAlertStatus('Enter a valid target price', 'error');
        return;
      }

      if (targetPrice >= currentPrice) {
        showAlertStatus('Target must be below current price', 'error');
        return;
      }

      if ((currentProductInfo?.identifier || '') === '') {
        console.warn('[PriceRadar Popup] currentProductInfo missing:', currentProductInfo);
        showAlertStatus('Product not yet tracked - try refreshing the page', 'error');
        return;
      }

      setAlertFormState(true, 'Setting alert...');

      chrome.runtime.sendMessage(
        {
          action: 'CREATE_ALERT',
          identifier: currentProductInfo.identifier,
          userEmail: email,
          targetPrice,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            showAlertStatus('Failed to set alert - check your connection', 'error');
            setAlertFormState(false, 'Set Alert');
            return;
          }

          if (response && response.success === false) {
            showAlertStatus(response.error || 'Failed to set alert', 'error');
            setAlertFormState(false, 'Set Alert');
            return;
          }

          showAlertStatus('Alert set successfully. A confirmation email was sent to your inbox.', 'success');
          setTimeout(() => {
            clearAlertStatus();
            setAlertFormState(false, 'Set Alert');
          }, 3000);
        }
      );
    } catch (error) {
      console.error('[PriceRadar Popup] Alert handler error:', error);
      showAlertStatus('Failed to set alert', 'error');
      setAlertFormState(false, 'Set Alert');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    attachAlertHandler();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try {
        if (chrome.runtime.lastError || !tabs || !tabs[0] || !tabs[0].url) {
          showState('error', 'Failed to load data');
          return;
        }

        const url = new URL(tabs[0].url);
        processPage(url);
      } catch (error) {
        showState('error', 'Failed to load data');
      }
    });
  } catch (error) {
    showState('error', 'Failed to load data');
  }
});
