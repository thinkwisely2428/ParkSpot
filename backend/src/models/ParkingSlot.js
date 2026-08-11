const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
  parkingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parking',
    required: true
  },
  slotNumber: { type: String, required: true },
  floor: { type: String, required: true },
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  vehicleType: {
    type: String,
    enum: ['CAR', 'BIKE'],
    default: 'CAR'
  },
  pricePerHour: { type: Number, required: true },
  status: {
    type: String,
    enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'],
    default: 'AVAILABLE'
  },
  currentVehiclePlate: { type: String },
  currentOwnerName: { type: String },
  occupiedSince: { type: Date },
  currentBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  slotType: { type: String, enum: ['REGULAR', 'EV', 'ACCESSIBLE', 'PREMIUM'], default: 'REGULAR' },
  chargerAvailable: { type: Boolean, default: false },
  chargerType: { type: String }, // e.g. "Fast Charging"
  chargingPower: { type: String }, // e.g. "7.2 kW"
  connectorType: { type: String }, // e.g. "Type 2"
  chargingPrice: { type: Number }  // per kWh
}, { timestamps: true });

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
