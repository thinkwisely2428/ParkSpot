const express = require('express');
const { createParking, getParkings, createSlot, getSlots } = require('../controllers/parking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.route('/')
  .post(protect, authorize('OWNER', 'ADMIN'), createParking)
  .get(getParkings);

router.route('/:parkingId/slots')
  .post(protect, authorize('OWNER', 'ADMIN'), createSlot)
  .get(getSlots);

module.exports = router;
