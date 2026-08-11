const Parking = require('../models/Parking');
const ParkingSlot = require('../models/ParkingSlot');

// @desc    Create parking facility
// @route   POST /api/parking
// @access  Owner
exports.createParking = async (req, res) => {
  try {
    req.body.ownerId = req.user.id;

    const parking = await Parking.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Parking facility created',
      data: parking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all parking facilities
// @route   GET /api/parking
// @access  Public
exports.getParkings = async (req, res) => {
  try {
    const parkings = await Parking.find({ status: 'APPROVED' });

    res.status(200).json({
      success: true,
      data: parkings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a parking slot
// @route   POST /api/parking/:parkingId/slots
// @access  Owner
exports.createSlot = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.parkingId);

    if (!parking) {
      return res.status(404).json({ success: false, message: 'Parking not found' });
    }

    // Make sure user is parking owner
    if (parking.ownerId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(401).json({ success: false, message: 'Not authorized to add a slot to this parking' });
    }

    req.body.parkingId = req.params.parkingId;

    const slot = await ParkingSlot.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Parking slot created',
      data: slot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get parking slots
// @route   GET /api/parking/:parkingId/slots
// @access  Public
exports.getSlots = async (req, res) => {
  try {
    const slots = await ParkingSlot.find({ parkingId: req.params.parkingId });

    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
