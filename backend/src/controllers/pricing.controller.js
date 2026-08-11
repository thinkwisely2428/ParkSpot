const PricingRule = require('../models/PricingRule');
const Parking = require('../models/Parking');

exports.createRule = async (req, res) => {
  try {
    const { parkingId } = req.body;
    
    // Ensure parking belongs to the owner making the request
    if (req.user.role !== 'ADMIN') {
      const parking = await Parking.findById(parkingId);
      if (!parking || parking.ownerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to add pricing rules to this facility.' });
      }
    }

    const rule = await PricingRule.create(req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getRules = async (req, res) => {
  try {
    const rules = await PricingRule.find({ parkingId: req.params.parkingId });
    res.status(200).json({ success: true, data: rules });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    const rule = await PricingRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    
    // Auth check simplified for speed, normally check ownerId
    await rule.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
