const Booking = require('../models/Booking');
const { checkAvailability } = require('../services/availability.service');
const crypto = require('crypto');

// @desc    Check availability
// @route   GET /api/bookings/availability
// @access  Public
exports.getAvailability = async (req, res) => {
  try {
    const { parkingId, date, startTime, endTime } = req.query;

    if (!parkingId || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Please provide parkingId, date, startTime, and endTime' });
    }

    const availableSlots = await checkAvailability(parkingId, date, startTime, endTime);

    res.status(200).json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create booking
// @route   POST /api/bookings
// @access  Commuter
exports.createBooking = async (req, res) => {
  try {
    const { parkingId, slotId, date, startTime, endTime, amount } = req.body;

    // Check availability one more time to prevent double booking
    const availableSlots = await checkAvailability(parkingId, date, startTime, endTime);
    
    const isSlotAvailable = availableSlots.some(slot => slot._id.toString() === slotId);

    if (!isSlotAvailable) {
      return res.status(409).json({ success: false, message: 'Slot is no longer available for this time' });
    }

    const bookingNumber = 'BK' + Date.now() + crypto.randomBytes(2).toString('hex').toUpperCase();

    const booking = await Booking.create({
      bookingNumber,
      userId: req.user.id,
      parkingId,
      slotId,
      date,
      startTime,
      endTime,
      amount
    });

    res.status(201).json({
      success: true,
      message: 'Booking created',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
