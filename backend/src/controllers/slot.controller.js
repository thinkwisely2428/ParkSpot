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

exports.updateRates = async (req, res) => {
  try {
    // Only Admin or Operator should probably be able to do this, but we'll trust the route protection
    const { rates } = req.body;
    
    if (!rates) {
      return res.status(400).json({ success: false, message: 'Rates object is required' });
    }

    const typeMapping = {
      standard: 'REGULAR',
      ev: 'EV',
      accessible: 'ACCESSIBLE',
      premium: 'PREMIUM'
    };

    // Update prices for all slots by type
    const updatePromises = [];
    for (const [frontendType, newPrice] of Object.entries(rates)) {
      const dbType = typeMapping[frontendType.toLowerCase()];
      if (dbType && typeof newPrice === 'number') {
        updatePromises.push(
          ParkingSlot.updateMany(
            { slotType: dbType },
            { $set: { pricePerHour: newPrice } }
          )
        );
      }
    }

    await Promise.all(updatePromises);

    // Emit event to update all connected clients
    if (global.io) {
      global.io.emit('rates:updated');
    }

    res.status(200).json({ success: true, message: 'Rates updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRates = async (req, res) => {
  try {
    const defaultRates = { standard: 60, ev: 100, accessible: 50, premium: 160 };
    
    // Find one slot of each type to check its price
    const types = ['REGULAR', 'EV', 'ACCESSIBLE', 'PREMIUM'];
    const rates = {};
    
    for (const dbType of types) {
      const slot = await ParkingSlot.findOne({ slotType: dbType });
      let frontendType = dbType.toLowerCase();
      if (frontendType === 'regular') frontendType = 'standard';
      
      if (slot && slot.pricePerHour) {
        rates[frontendType] = slot.pricePerHour;
      } else {
        rates[frontendType] = defaultRates[frontendType];
      }
    }
    
    res.status(200).json({ success: true, rates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
