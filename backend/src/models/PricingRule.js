const mongoose = require('mongoose');

const PricingRuleSchema = new mongoose.Schema({
  parkingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parking',
    required: true,
  },
  name: { type: String, required: true }, // e.g., "Morning Peak"
  type: { type: String, enum: ['TIME_BASED', 'OCCUPANCY_BASED'], required: true, default: 'TIME_BASED' },
  
  // For TIME_BASED
  startTime: { type: String }, // "09:00"
  endTime: { type: String },   // "12:00"
  
  // For OCCUPANCY_BASED
  minOccupancyPercent: { type: Number }, // 75
  maxOccupancyPercent: { type: Number }, // 100

  // The actual pricing adjustment (either use multiplier OR fixed override)
  priceMultiplier: { type: Number, default: 1.0 },
  fixedPriceOverride: { type: Number }, 
  
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('PricingRule', PricingRuleSchema);
