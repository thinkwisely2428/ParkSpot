const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
  parkingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parking',
    required: true
  },
  slotNumber: { type: String, required: true },
  vehicleType: {
    type: String,
    enum: ['CAR', 'BIKE'],
    default: 'CAR'
  },
  pricePerHour: { type: Number, required: true },
  status: {
    type: String,
    enum: ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'PAYMENT_PENDING'],
    default: 'AVAILABLE'
  }
}, { timestamps: true });

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
