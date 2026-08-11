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
    let query = { status: 'APPROVED' };
    
    if (req.query.ev_only === 'true') {
      const evSlots = await ParkingSlot.find({ slotType: 'EV' }).select('parkingId');
      const parkingIdsWithEV = evSlots.map(slot => slot.parkingId);
      query._id = { $in: parkingIdsWithEV };
    }

    const parkings = await Parking.find(query);

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
    let parkingId = req.params.parkingId;
    
    // If frontend sends the placeholder, fallback to the first parking in the DB
    if (parkingId === 'DEFAULT_PARKING_ID') {
      const defaultParking = await Parking.findOne();
      if (defaultParking) {
        parkingId = defaultParking._id;
      }
    }

    const slots = await ParkingSlot.find({ parkingId });

    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
