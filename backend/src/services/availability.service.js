const Booking = require('../models/Booking');
const ParkingSlot = require('../models/ParkingSlot');
const SlotHold = require('../models/SlotHold');

exports.checkAvailability = async (parkingId, date, requestedStart, requestedEnd, userId = null) => {
  // 1. Get all slots for parking
  const slots = await ParkingSlot.find({ parkingId, status: { $ne: 'MAINTENANCE' } });
  
  // 2. Get existing active bookings for that date
  const bookings = await Booking.find({
    parkingId,
    date,
    status: { $in: ['PENDING', 'CONFIRMED', 'ACTIVE'] }
  });

  // 3. Get active holds
  const activeHolds = await SlotHold.find({ parkingId });

  // 4. Filter slots
  const availableSlots = slots.filter(slot => {
    // Check bookings
    const slotBookings = bookings.filter(b => b.slotId.toString() === slot._id.toString());
    const hasBookingConflict = slotBookings.some(b => {
      return (requestedStart < b.endTime) && (requestedEnd > b.startTime);
    });

    if (hasBookingConflict) return false;

    // Check holds (exclude if held by someone else)
    const slotHold = activeHolds.find(h => h.slotId.toString() === slot._id.toString());
    if (slotHold) {
      if (userId && slotHold.userId.toString() === userId.toString()) {
        return true; // Held by me, so it's "available" to me for booking
      }
      return false; // Held by someone else
    }

    return true;
  });

  return availableSlots;
};
