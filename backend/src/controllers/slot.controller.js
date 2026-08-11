const SlotHold = require('../models/SlotHold');
const ParkingSlot = require('../models/ParkingSlot');

exports.holdSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { parkingId } = req.body;
    
    // 1. Check if slot exists
    const slot = await ParkingSlot.findById(slotId);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });

    // 2. Check if already held by someone else
    const existingHold = await SlotHold.findOne({ slotId });
    if (existingHold) {
      if (existingHold.userId.toString() !== req.user.id) {
        return res.status(409).json({ success: false, message: 'Slot is currently held by another user.' });
      }
      // If it's already held by THIS user, just refresh the timer
      existingHold.expiresAt = new Date(Date.now() + 60000);
      await existingHold.save();
      return res.status(200).json({ success: true, message: 'Hold refreshed', data: existingHold });
    }

    // 3. Create new hold (expires in 60s)
    const expiresAt = new Date(Date.now() + 60000); // 60 seconds from now
    
    const hold = await SlotHold.create({
      slotId,
      userId: req.user.id,
      parkingId,
      expiresAt
    });

    // 4. Emit socket event
    if (global.io) {
      global.io.to(parkingId).emit('slot:held', { slotId, userId: req.user.id, expiresAt });
    }

    res.status(201).json({ success: true, message: 'Slot held for 60 seconds', data: hold });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.releaseSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    
    const hold = await SlotHold.findOne({ slotId, userId: req.user.id });
    if (!hold) return res.status(404).json({ success: false, message: 'Hold not found or already expired' });

    await hold.deleteOne();

    if (global.io) {
      global.io.to(hold.parkingId.toString()).emit('slot:released', { slotId });
    }

    // Trigger waitlist logic (Feature 2) -> will be added here later

    res.status(200).json({ success: true, message: 'Hold released' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
