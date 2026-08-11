const mongoose = require('mongoose');

const SlotHoldSchema = new mongoose.Schema({
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSlot',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parkingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parking',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index!
  }
}, { timestamps: true });

module.exports = mongoose.model('SlotHold', SlotHoldSchema);
