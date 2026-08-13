const express = require('express');
const { holdSlot, releaseSlot, updateRates, getRates } = require('../controllers/slot.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/rates', getRates);
router.put('/rates', protect, authorize('ADMIN', 'OWNER'), updateRates);
router.post('/:slotId/hold', protect, holdSlot);
router.post('/:slotId/release', protect, releaseSlot);

module.exports = router;
