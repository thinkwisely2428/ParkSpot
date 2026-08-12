const mongoose = require('mongoose');

const p2pListingSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostName: { type: String, required: true },
  hostPhone: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  location: {
    lat: { type: Number, default: 13.0827 },
    lng: { type: Number, default: 80.2707 }
  },
  spotType: {
    type: String,
    enum: ['Driveway', 'Garage', 'Private Lot', 'Commercial Yard'],
    default: 'Driveway'
  },
  allowedVehicles: [{
    type: String,
    enum: ['Car', 'Bike', 'SUV', 'Truck', 'EV Car']
  }],
  pricePerHour: { type: Number, required: true },
  startTime: { type: String, default: '06:00' },
  endTime: { type: String, default: '22:00' },
  availableDays: [{ type: String }],
  hostRules: [{ type: String }],
  isKycVerified: { type: Boolean, default: true },
  isPhotoVerified: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'PENDING'],
    default: 'ACTIVE'
  },
  images: [{ type: String }],
  rating: { type: Number, default: 4.8 },
  reviewCount: { type: Number, default: 12 },
  reviews: [{
    userName: String,
    rating: Number,
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('P2PListing', p2pListingSchema);
