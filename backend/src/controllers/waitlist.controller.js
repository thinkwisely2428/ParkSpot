const Waitlist = require('../models/Waitlist');

exports.joinWaitlist = async (req, res) => {
  try {
    const { parkingId } = req.body;
    
    // Check if already in waitlist
    const existing = await Waitlist.findOne({ parkingId, userId: req.user.id, status: 'WAITING' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You are already on the waitlist for this facility.' });
    }

    const waitlist = await Waitlist.create({ parkingId, userId: req.user.id });
    
    // Calculate position
    const position = await Waitlist.countDocuments({ parkingId, status: 'WAITING', createdAt: { $lte: waitlist.createdAt } });

    res.status(201).json({ success: true, message: 'Joined waitlist', position });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPosition = async (req, res) => {
  try {
    const { parkingId } = req.params;
    const entry = await Waitlist.findOne({ parkingId, userId: req.user.id, status: { $in: ['WAITING', 'NOTIFIED'] } });
    
    if (!entry) return res.status(404).json({ success: false, message: 'Not on waitlist' });
    
    if (entry.status === 'NOTIFIED') {
      return res.status(200).json({ success: true, status: 'NOTIFIED', expiresAt: entry.expiresAt });
    }

    const position = await Waitlist.countDocuments({ parkingId, status: 'WAITING', createdAt: { $lte: entry.createdAt } });
    res.status(200).json({ success: true, status: 'WAITING', position });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.leaveWaitlist = async (req, res) => {
  try {
    const { parkingId } = req.params;
    await Waitlist.findOneAndUpdate({ parkingId, userId: req.user.id, status: 'WAITING' }, { status: 'CANCELLED' });
    res.status(200).json({ success: true, message: 'Left waitlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
