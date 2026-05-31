import mongoose from 'mongoose';

const externalProductSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  platform: {
    type: String,
    required: true,
    enum: ['amazon', 'flipkart'],
  },
  productUrl: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: '',
  },
  priceHistory: [
    {
      date: { type: Date, default: Date.now },
      price: { type: Number, required: true },
    },
  ],
  aiCache: {
    explanation: { type: String, default: '' },
    confidence: { type: String, default: '' },
    cachedAt: { type: Date, default: null },
    analysis: {
      verdict: { type: String, default: '' },
      dropProbability: { type: Number, default: 0 },
      mlReason: { type: String, default: '' },
      fairRange: {
        low: { type: Number, default: 0 },
        high: { type: Number, default: 0 },
      },
      currentPrice: { type: Number, default: 0 },
    },
  },
  lastScrapedAt: {
    type: Date,
    default: null,
  },
  userLastVisitedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  collection: 'externalproducts',
});

const ExternalProduct = mongoose.model('ExternalProduct', externalProductSchema);

export default ExternalProduct;
