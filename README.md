# PriceRadar — Smart Price Tracking & AI-Powered Buying Recommendations

<img src="https://img.shields.io/badge/Chrome-Ready-2EA44F?style=flat-square" alt="Chrome Ready"> <img src="https://img.shields.io/badge/Node.js-ES%20Modules-336633?style=flat-square" alt="Node.js"> <img src="https://img.shields.io/badge/MongoDB-Atlas-13AA52?style=flat-square" alt="MongoDB">

**PriceRadar** is a Chrome extension that tracks product prices on Amazon.in and Flipkart, maintains price history, analyzes trends using AI (GitHub Models/OpenAI), and sends email alerts when prices drop below your target.

LLM-powered AI analysis (GitHub Models / OpenAI) provides concise, confidence-scored buying recommendations.

Perfect for budget-conscious shoppers who want intelligent buying recommendations backed by historical price data.

---

## 🎯 Features

- ✅ **Real-Time Price Tracking** — Automatically captures current prices on Amazon & Flipkart product pages
- 📊 **Price History & Analytics** — Stores a rolling 90-day price history per product
- 🤖 **AI-Powered Analysis** — Uses GitHub Models or OpenAI to generate a short buying recommendation; confidence improves with more history
  - Buy Now (strong buy signal when model probability and price vs average indicate a good entry)
  - Good Time (moderate buy signal based on recent history)
  - Wait (model suggests prices may drop further)
  - Not Ideal (insufficient or very limited history; low confidence)
- 📈 **Visual Charts** — Local canvas-based price trend visualization in popup
- 🔔 **Email Alerts** — Receive instant alerts when tracked products drop below your target price (via Resend)
- 📱 **Floating Badge** — Quick access to extension popup from product pages
- 🔄 **Automatic Price Updates** — Daily scheduler updates prices using ScraperAPI
- ⏰ **Hourly Alert Checker** — Automatic daemon checks for price drops and sends emails
- 🚀 **Chrome MV3 Compliant** — Modern security standards with strict CSP

---

## 🏗️ Tech Stack

### Backend
- **Runtime:** Node.js v22.17.1 (ES modules)
- **Framework:** Express.js 5.2.1
- **Database:** MongoDB Atlas (cloud)
- **Scheduling:** node-cron 4.2.1 (hourly alerts, daily price updates)
- **Email:** Resend (transactional emails)
- **AI Analysis:** GitHub Models API (free) or OpenAI SDK
- **Web Scraping:** ScraperAPI (server-side) + Cheerio HTML parser
- **Utilities:** Axios, Dotenv

### Extension (Chrome)
- **Manifest:** v3 (security-first architecture)
- **Content Scripts:** Dynamic product extraction from Amazon/Flipkart
- **Background Worker:** Service worker for message routing & API calls
- **Popup UI:** HTML/CSS/JS with local canvas charting (no external dependencies)
- **Storage:** chrome.storage.local for offline data & fallback

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 20+ (tested on v22.17.1)
- MongoDB Atlas account (free tier available)
- Chrome browser
- Resend API key (for email alerts)
- GitHub Personal Access Token (for GitHub Models API)
- ScraperAPI key (for daily price scraping)

### Backend Setup

#### 1. Clone & Install Dependencies
```bash
cd Extension/backend
npm install
```

#### 2. Configure Environment Variables
Create `.env` file in `Extension/backend/`:
```env
# Database
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=extension_db

# Server
PORT=5000
NODE_ENV=development

# AI (choose one)
GITHUB_PAT=ghp_your_personal_access_token  # Free option
# OR
# OPENAI_API_KEY=sk-your-openai-key

# Email
RESEND_API_KEY=re_your_resend_key
FROM_EMAIL=alerts@radarprice.tech
FROM_NAME=PriceRadar

# Scraping
SCRAPERAPI_KEY=your_scraperapi_key
```

#### 3. Start Backend (Development)
```bash
npm run dev        # Watch mode with nodemon
# OR
npm start          # Production
```

Backend will be available at `http://localhost:5000`

Test health endpoint:
```bash
curl http://localhost:5000/health
# Expected: {"status":"ok","uptime":1.234}
```

---

### Extension Setup

#### 1. Load Extension in Chrome
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select `Extension/extension/` folder
5. Extension should appear in Chrome's toolbar

#### 2. Update Backend URL
Edit `Extension/extension/background.js`:
```javascript
// For local development
const BACKEND_URL = 'http://localhost:5000';

// For production (replace with your DigitalOcean domain)
const BACKEND_URL = 'https://your-domain.com';
```

#### 3. Reload Extension
After any code changes, click the reload icon on the extension card in `chrome://extensions/`.

---

## 📖 How to Use

### Tracking a Product
1. Navigate to an **Amazon product page** or **Flipkart product page**
2. A **floating badge** (bottom-right corner) appears with the extension icon
3. Click the badge → Extension popup opens
4. Click **"Track This Product"** button
5. You'll see: `"Tracking started! Analysis available immediately; confidence improves with more daily snapshots."`
  - Initial analysis is available immediately but will be low-confidence with very little history. UI treats histories shorter than 7 days as "limited history". Accuracy improves after 7–15 days and continues to improve up to the 90-day rolling window.
6. Daily snapshots are recorded once per day (so analysis will improve as daily data accumulates).

### Viewing Analysis & History
- **Price Chart** shows historical trend
- **AI Verdict** recommends when to buy:
  - 🟢 **Buy Now** — Below average price
  - 🟡 **Good Time** — Near historical low
  - 🔴 **Wait** — Above average, expect price drop
  - ⚪ **Not Ideal** — Not enough data yet
- **Statistics** show:
 - **Statistics** show: (labels adapt to available history — e.g. `30-day`, `90-day`, or `Observed (N days)`)
  - Lowest price for the displayed window
  - Average price for the displayed window
  - Highest price for the displayed window

### Setting Price Alerts
1. In popup, enter your **target price** (e.g., Rs 30,000)
2. Enter your **email address**
3. Click **"Set Alert"**
4. When price drops below target, you'll receive email within 1 hour

---

## 🏛️ Project Structure

```
Extension/
├── backend/                           # Node.js/Express API server
│   ├── index.js                      # Entry point, scheduler initialization
│   ├── app.js                        # Express app, middleware, routes
│   ├── package.json                  # Dependencies & scripts
│   ├── .env                          # Environment variables (gitignored)
│   ├── .env.example                  # Template for .env
│   └── src/
│       ├── controllers/
│       │   └── priceTracking.controller.js    # API handler logic
│       ├── routes/
│       │   └── priceTracking.routes.js        # API endpoints
│       ├── models/
│       │   ├── externalProduct.model.js       # Product MongoDB schema
│       │   └── externalAlert.model.js         # Alert/user email schema
│       ├── services/
│       │   ├── email.service.js               # Resend email service
│       │   ├── alertScheduler.service.js      # Hourly alert checker daemon
│       │   └── priceUpdateScheduler.service.js # Daily price scraper
│       ├── utils/
│       │   ├── priceAnalysis.js               # AI analysis logic
│       │   ├── priceSync.js                   # ScraperAPI sync
│       │   ├── externalDropProbability.js     # Price drop calculation
│       │   ├── ApiError.js                    # Custom error class
│       │   ├── ApiResponse.js                 # Response wrapper
│       │   └── AsyncHandler.js                # Async error wrapper
│       └── db/
│           └── index.js              # MongoDB connection
│
├── extension/                         # Chrome MV3 Extension
│   ├── manifest.json                 # Extension metadata & permissions
│   ├── background.js                 # Service worker (message routing)
│   ├── content.js                    # Content script (page injection)
│   ├── icons/
│   │   ├── icon16.png               # 16x16 toolbar icon
│   │   ├── icon48.png               # 48x48 extension page icon
│   │   └── icon128.png              # 128x128 install icon
│   ├── popup/
│   │   ├── popup.html               # Popup UI
│   │   ├── popup.css                # Popup styling
│   │   └── popup.js                 # Popup logic & chart rendering
│   └── utils/
│       └── extractors.js            # Amazon/Flipkart price extraction

└── README.md                         # This file
```

---

## 🔌 API Endpoints

### Track Product
**POST** `/api/v1/price-tracking/track`

Request:
```json
{
  "identifier": "amazon-B0C9KKG7BK",
  "platform": "amazon",
  "name": "iPhone 15 Pro",
  "currentPrice": 99999,
  "productUrl": "https://amazon.in/dp/B0C9KKG7BK",
  "imageUrl": "https://..."
}
```

Response:
```json
{
  "statuscode": 201,
  "data": { "_id": "507f1f77bcf86cd799439011", "identifier": "..." },
  "message": "Product tracked",
  "success": true
}
```

### Get Analysis
**GET** `/api/v1/price-tracking/:identifier/analysis`

Response (example):
```json
{
  "statuscode": 200,
  "data": {
    "identifier": "amazon-B0C9KKG7BK",
    "name": "Example Product",
    "platform": "amazon",
    "currentPrice": 98999,
    "priceHistory": [
      { "date": "2026-02-24T00:00:00.000Z", "price": 99999 },
      { "date": "2026-03-24T00:00:00.000Z", "price": 99500 },
      { "date": "2026-04-24T00:00:00.000Z", "price": 98999 }
    ],
    "verdict": "Good Time",
    "dropProbability": 53,
    "mlReason": "53% drop probability",
    "aiExplanation": "Good time — Rs 98,999 is ~14% below the 90-day average; consider buying now.",
    "aiConfidence": "medium",
    "fairRange": { "low": 98500, "high": 100000 }
  },
  "success": true
}
```

### Create Alert
**POST** `/api/v1/price-tracking/:identifier/alert`

Request:
```json
{
  "userEmail": "user@gmail.com",
  "targetPrice": 95000
}
```

### Get Price History
**GET** `/api/v1/price-tracking/:identifier/history`

Response: Array of daily price records with timestamps

### Health Check
**GET** `/health`

Response:
```json
{
  "status": "ok",
  "uptime": 3600.5
}
```

---

## ⚙️ Configuration

### Price Analysis Verdicts (AI Logic)

The system evaluates prices based on historical data:

| Verdict | Condition (simplified) | Notes |
|---------|----------------------|-------|
| **Buy Now** | ML dropProbability > 60 AND current price ≥ ~5% below average | Strong buy signal (high confidence)
| **Good Time** | ML dropProbability > 40 AND current price below average | Moderate buy signal
| **Wait** | ML dropProbability > 20 | Suggests waiting may yield better price
| **Not Ideal** | Otherwise or very limited history | Low-confidence result; analysis will note limitations

### Scheduling

**Hourly Alert Checker:**
- Runs every 60 minutes (cron: `0 * * * *`)
- Checks all alerts for price drops and sends emails via Resend when thresholds are met
- Safe to restart (duplicate prevention via MongoDB)

**Daily Price Update:**
- Runs once per day (cron: `0 2 * * *` — currently configured to run at 02:00 server local time)
- Scrapes all tracked products via ScraperAPI and records a daily snapshot
- Enforces a rolling 90-day window for stored history
- Fallback: if scrape fails, the day's price is not added

---

## 🚀 Deployment

### DigitalOcean Deployment

#### 1. Create App Platform or Droplet
```bash
# SSH into droplet
ssh root@your-do-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Clone repo
cd /home
git clone https://github.com/your-user/priceradar.git
cd priceradar/Extension/backend

# Install dependencies
npm install

# Create .env with production values
nano .env
```

#### 2. Set Up Environment
```env
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/extension_db?retryWrites=true&w=majority
PORT=5000
NODE_ENV=production
GITHUB_PAT=ghp_xxxx
RESEND_API_KEY=re_xxxx
FROM_EMAIL=alerts@radarprice.tech
FROM_NAME=PriceRadar
SCRAPERAPI_KEY=xxxx
```

#### 3. Start with PM2
```bash
npm install -g pm2
pm2 start index.js --name priceradar
pm2 save
pm2 startup
```

#### 4. Setup Reverse Proxy (Nginx)
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/default
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Setup HTTPS (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 6. Update Extension
Edit `Extension/extension/background.js`:
```javascript
const BACKEND_URL = 'https://your-domain.com';
```

---

## 🐛 Known Limitations

1. **Limited initial history (low-confidence)**
  - AI analysis is available immediately but is low-confidence when there is very little historical data.
  - The backend treats products with fewer than 7 daily snapshots as `Not Ideal` to avoid noisy recommendations. Accuracy typically improves after 7–15 days and continues improving up to the 90-day rolling window.
  - Workaround: revisit the product after several daily snapshots or add historical prices manually if available.

2. **Flipkart SPA navigation and detection**
  - Flipkart uses single-page navigation; the extension detects URL changes by polling periodically (approx. 1.5s).
  - The popup includes short retry logic (multiple attempts with small backoffs) to handle quick navigations, but very slow devices or edge cases may still miss transitions.

3. **Chrome-only support**
  - The extension targets Chrome MV3. Running on other browsers may require a separate manifest and additional compatibility work.

4. **Rate limiting and production hardening**
  - There is no built-in rate limiter in the current backend. For production, add `express-rate-limit` or an API gateway to protect endpoints.

5. **Price extraction fragility**
  - The scraper uses CSS selectors for Amazon/Flipkart and can break when site markup changes. Keep selectors up to date or provide a manual-entry fallback.

---

## 🔐 Security & Privacy

- **Content Security Policy:** Only self-hosted scripts (`'self'`)
- **CORS:** Chrome extension origin only in production
- **Data Storage:** MongoDB Atlas (encrypted at rest)
- **Emails:** Sent via Resend (trusted email service)
- **No Tracking:** Extension doesn't collect user behavior
- **Open Source:** Code available for audit

---

## 🗓️ Future Roadmap

- [ ] **Edge Browser Support** — Manifest V3 adaptation for Microsoft Edge
- [ ] **Request Logging** — Structured logging for debugging (Winston/Pino)
- [ ] **Rate Limiting** — Express-rate-limit protection on API
- [ ] **Price Comparison** — Compare same product across sellers
- [ ] **Wishlist Sync** — Sync with browser bookmarks
- [ ] **Telegram Alerts** — Optional Telegram bot notifications
- [ ] **Historical Export** — CSV export of price history
- [ ] **Multi-Currency** — Support international pricing
- [ ] **Image Caching** — Local product images to reduce loads
- [ ] **Analytics Dashboard** — Track price trends across categories

---

## 📊 Database Schema

### ExternalProduct
```javascript
{
  identifier: String,           // "amazon-B0C9KKG7BK" or "flipkart-ABC123"
  platform: String,             // "amazon" or "flipkart"
  name: String,
  productUrl: String,
  imageUrl: String,
  priceHistory: [{
    date: Date,
    price: Number
  }],
  currentPrice: Number,
  lowestPrice: Number,
  highestPrice: Number,
  averagePrice: Number,
  trackedAt: Date,
  updatedAt: Date
}
```

### ExternalAlert
```javascript
{
  productId: ObjectId,          // Ref to ExternalProduct
  userEmail: String,
  targetPrice: Number,
  status: String,               // "active" or "triggered"
  createdAt: Date,
  triggeredAt: Date
}
```

---

## 🧪 Testing

### Manual Testing
```bash
# Start backend
cd Extension/backend && npm run dev

# Load extension in Chrome (chrome://extensions/)
# Navigate to Amazon/Flipkart product page
# Click badge → should track product
# Check MongoDB: db.externalproducts.findOne()
```

### API Testing (curl)
```bash
# Track a product
curl -X POST http://localhost:5000/api/v1/price-tracking/track \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test-001",
    "platform": "amazon",
    "name": "Test Product",
    "currentPrice": 5000,
    "productUrl": "https://...",
    "imageUrl": "https://..."
  }'

# Get analysis
curl http://localhost:5000/api/v1/price-tracking/test-001/analysis
```

---

## 📝 Environment Variables Reference

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `MONGODB_URL` | Yes | `mongodb+srv://...` | Database connection |
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `GITHUB_PAT` | Yes* | `ghp_...` | GitHub Models API (free) |
| `OPENAI_API_KEY` | Yes* | `sk-...` | OpenAI API (alternative) |
| `RESEND_API_KEY` | Yes | `re_...` | Email service |
| `FROM_EMAIL` | Yes | `alerts@...` | Email sender address |
| `FROM_NAME` | Yes | `PriceRadar` | Email sender name |
| `SCRAPERAPI_KEY` | Yes | `...` | ScraperAPI key |

*Choose either GITHUB_PAT (free) OR OPENAI_API_KEY (paid)

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m "Add my feature"`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see LICENSE file for details.

---

## 💬 Support

For issues or questions:
- Open a GitHub Issue
- Email: support@radarprice.tech
- Check existing documentation

---

## 🙏 Acknowledgments

- **Chrome MV3** — Security-first extension architecture
- **MongoDB Atlas** — Scalable cloud database
- **Resend** — Transactional email service
- **ScraperAPI** — Reliable web scraping
- **GitHub Models API** — Free AI analysis

---

**Made with ❤️ by StoreNova Team**

Version: 1.0.0
