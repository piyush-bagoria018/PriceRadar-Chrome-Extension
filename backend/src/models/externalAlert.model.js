import mongoose from 'mongoose';

const externalAlertSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    trim: true,
  },
  platform: {
    type: String,
    enum: ['amazon', 'flipkart'],
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      message: 'Please provide a valid email address',
    },
  },
  targetPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  productName: {
    type: String,
    required: true,
  },
  productUrl: {
    type: String,
    default: '',
  },
  notified: {
    type: Boolean,
    default: false,
  },
  notifiedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  collection: 'externalalerts',
});

externalAlertSchema.index({ identifier: 1, userEmail: 1 }, { unique: true });

const ExternalAlert = mongoose.model('ExternalAlert', externalAlertSchema);

export default ExternalAlert;
