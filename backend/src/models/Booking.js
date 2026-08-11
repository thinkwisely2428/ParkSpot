const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNumber: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', required: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSlot', required: true },
  date: { type: String, required: true }, // e.g., '2026-08-20'
  startTime: { type: String, required: true }, // e.g., '10:00'
  endTime: { type: String, required: true }, // e.g., '12:00'
  amount: { type: Number, required: true },
  vehiclePlate: { type: String },
  ownerName: { type: String },
  paymentId: { type: String },
  qrTokenId: { type: String },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'EXPIRED'],
    default: 'PENDING'
  },
  originalAmount: { type: Number },
  cancellationFee: { type: Number },
  refundAmount: { type: Number },
  refundStatus: { type: String, enum: ['PENDING', 'PROCESSED', 'FAILED'] },
  cancellationReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
