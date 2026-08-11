const Booking = require('../models/Booking');
const ParkingSlot = require('../models/ParkingSlot');
const { checkAvailability } = require('../services/availability.service');
const { calculateDynamicPrice } = require('../services/pricing.service');
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
    let { parkingId, slotId, date, startTime, endTime, amount, vehiclePlate, guestName } = req.body;

    // 1. Fetch slot base price and override parkingId
    const slot = await ParkingSlot.findById(slotId);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    
    // Override parkingId with the actual parkingId of the slot
    parkingId = slot.parkingId.toString();

    // 2. Check availability
    const availableSlots = await checkAvailability(parkingId, date, startTime, endTime, req.user.id);
    const isAvailable = availableSlots.some(s => s._id.toString() === slotId);
    if (!isAvailable) {
      return res.status(400).json({ success: false, message: 'Slot is not available for the requested time' });
    }
    
    // 3. Calculate dynamic price
    const pricingObj = await calculateDynamicPrice(parkingId, slot.pricePerHour, startTime, endTime, 0); // Hardcoded 0 occupancy for now
    
    // 4. Override amount with calculated amount (bypass validation for now)
    amount = pricingObj.total;

    const bookingNumber = 'BKG' + Date.now().toString().slice(-6) + crypto.randomBytes(2).toString('hex').toUpperCase();
    const qrTokenId = crypto.randomBytes(16).toString('hex');

    const booking = await Booking.create({
      bookingNumber,
      userId: req.user.id,
      parkingId,
      slotId,
      date,
      startTime,
      endTime,
      amount,
      vehiclePlate,
      ownerName: guestName,
      qrTokenId,
      status: 'CONFIRMED'
    });

    // Update the slot status to OCCUPIED
    slot.status = 'OCCUPIED';
    slot.currentVehiclePlate = vehiclePlate;
    slot.currentOwnerName = guestName;
    slot.occupiedSince = new Date();
    slot.currentBookingId = booking._id;
    await slot.save();

    // Emit real-time event to everyone viewing this parking facility
    if (global.io) {
      global.io.to(parkingId).emit('slot_updated', slot);
      global.io.to('DEFAULT_PARKING_ID').emit('slot_updated', slot);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.userId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or confirmed bookings can be cancelled.' });
    }

    const fee = booking.amount * 0.25;
    const refund = booking.amount * 0.75;

    booking.originalAmount = booking.amount;
    booking.cancellationFee = fee;
    booking.refundAmount = refund;
    booking.refundStatus = 'PENDING';
    booking.status = 'CANCELLED';
    
    await booking.save();

    // Trigger waitlist notification if anyone is waiting
    const Waitlist = require('../models/Waitlist');
    const waitlistEntry = await Waitlist.findOne({ parkingId: booking.parkingId, status: 'WAITING' }).sort('createdAt');
    if (waitlistEntry) {
      waitlistEntry.status = 'NOTIFIED';
      waitlistEntry.notifiedAt = new Date();
      waitlistEntry.expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes
      await waitlistEntry.save();
      
      if (global.io) {
        global.io.to(waitlistEntry.userId.toString()).emit('waitlist:updated', { message: 'Slot available', parkingId: booking.parkingId });
      }
    }

    if (global.io) {
      global.io.to(booking.parkingId.toString()).emit('booking:cancelled', { slotId: booking.slotId });
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled. 25% fee applied.',
      refundAmount: refund
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    
    // Normal checkout implies the booking was active/pending
    booking.status = 'COMPLETED';
    booking.paymentId = req.body.paymentId || 'CASH_PAYMENT';
    await booking.save();
    
    // Release the slot
    const slot = await ParkingSlot.findById(booking.slotId);
    if (slot) {
      slot.status = 'AVAILABLE';
      slot.currentVehiclePlate = null;
      slot.currentOwnerName = null;
      slot.occupiedSince = null;
      slot.currentBookingId = null;
      await slot.save();
    }
    
    if (global.io) {
      global.io.to(booking.parkingId.toString()).emit('slot_updated', slot);
      global.io.to('DEFAULT_PARKING_ID').emit('slot_updated', slot);
    }

    res.status(200).json({
      success: true,
      message: 'Booking completed successfully.',
      data: booking
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'COMMUTER') {
      filter.userId = req.user.id;
    }
    const bookings = await Booking.find(filter)
      .populate('slotId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
