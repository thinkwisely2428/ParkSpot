const express = require('express');
const { getAvailability, createBooking } = require('../controllers/booking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/availability', getAvailability);
router.post('/', protect, authorize('COMMUTER'), createBooking);

module.exports = router;
