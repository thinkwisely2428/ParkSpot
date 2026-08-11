const express = require('express');
const { createRule, getRules, deleteRule } = require('../controllers/pricing.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', protect, authorize('OWNER', 'ADMIN'), createRule);
router.get('/:parkingId', getRules);
router.delete('/:id', protect, authorize('OWNER', 'ADMIN'), deleteRule);

module.exports = router;
