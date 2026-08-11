const express = require('express');
const { getAvailability, createBooking, cancelBooking, completeBooking, getUserBookings } = require('../controllers/booking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { z } = require('zod');

const router = express.Router();

const createBookingSchema = z.object({
  body: z.object({
    parkingId: z.string(),
    slotId: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    amount: z.number().positive(),
    vehiclePlate: z.string().optional(),
    guestName: z.string().optional(),
  })
});

router.get('/availability', getAvailability);
router.get('/', protect, getUserBookings);
router.post('/', protect, authorize('COMMUTER', 'ADMIN', 'OWNER'), validate(createBookingSchema), createBooking);
router.post('/:id/cancel', protect, authorize('COMMUTER'), cancelBooking);
router.post('/:id/complete', protect, authorize('OWNER', 'ADMIN', 'COMMUTER'), completeBooking);

module.exports = router;
