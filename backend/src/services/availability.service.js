const Booking = require('../models/Booking');
const ParkingSlot = require('../models/ParkingSlot');

exports.checkAvailability = async (parkingId, date, requestedStart, requestedEnd) => {
  // 1. Get all slots for parking
  const slots = await ParkingSlot.find({ parkingId, status: { $ne: 'MAINTENANCE' } });
  
  // 2. Get existing active bookings for that date
  const bookings = await Booking.find({
    parkingId,
    date,
    status: { $in: ['PENDING', 'CONFIRMED', 'ACTIVE'] }
  });

  // 3. Filter slots
  const availableSlots = slots.filter(slot => {
    const slotBookings = bookings.filter(b => b.slotId.toString() === slot._id.toString());
    
    // Check conflicts based on time overlap
    // requestedStart < existingEnd AND requestedEnd > existingStart
    const hasConflict = slotBookings.some(b => {
      return (requestedStart < b.endTime) && (requestedEnd > b.startTime);
    });

    return !hasConflict;
  });

  return availableSlots;
};
