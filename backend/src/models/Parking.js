const mongoose = require('mongoose');

const parkingSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  images: [{ type: String }],
  openingTime: { type: String, required: true },
  closingTime: { type: String, required: true },
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'PENDING_APPROVAL'
  }
}, { timestamps: true });

module.exports = mongoose.model('Parking', parkingSchema);
