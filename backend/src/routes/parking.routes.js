const express = require('express');
const { createParking, getParkings, createSlot, getSlots } = require('../controllers/parking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { z } = require('zod');

const router = express.Router();

const createParkingSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    address: z.string().min(5, 'Address is required'),
    latitude: z.number(),
    longitude: z.number(),
    openingTime: z.string(),
    closingTime: z.string(),
  })
});

const createSlotSchema = z.object({
  body: z.object({
    slotNumber: z.string().min(1, 'Slot number is required'),
    vehicleType: z.enum(['CAR', 'BIKE']).optional(),
    pricePerHour: z.number().positive(),
  })
});

router.route('/')
  .post(protect, authorize('OWNER', 'ADMIN'), validate(createParkingSchema), createParking)
  .get(getParkings);

router.route('/:parkingId/slots')
  .post(protect, authorize('OWNER', 'ADMIN'), validate(createSlotSchema), createSlot)
  .get(getSlots);

module.exports = router;
