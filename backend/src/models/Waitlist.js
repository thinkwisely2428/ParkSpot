const mongoose = require('mongoose');

const WaitlistSchema = new mongoose.Schema({
  parkingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parking',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['WAITING', 'NOTIFIED', 'CLAIMED', 'EXPIRED', 'CANCELLED'],
    default: 'WAITING'
  },
  notifiedAt: { type: Date },
  expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Waitlist', WaitlistSchema);
