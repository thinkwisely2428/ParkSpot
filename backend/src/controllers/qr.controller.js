const Booking = require('../models/Booking');

// @desc    Verify QR Code
// @route   POST /api/qr/verify
// @access  Owner / Admin
exports.verifyQR = async (req, res) => {
  try {
    const { qrTokenId } = req.body;

    if (!qrTokenId) {
      return res.status(400).json({ success: false, message: 'Please provide qrTokenId' });
    }

    const booking = await Booking.findOne({ qrTokenId }).populate('parkingId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Invalid QR code. Booking not found.' });
    }

    if (req.user.role !== 'ADMIN' && booking.parkingId.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to verify passes for this parking facility.' });
    }

    if (booking.status !== 'CONFIRMED' && booking.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: `Booking status is ${booking.status}. Cannot process entry.` });
    }

    booking.status = 'ACTIVE';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'QR verification successful. Entry granted.',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
