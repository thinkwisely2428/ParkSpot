const express = require('express');
const { holdSlot, releaseSlot } = require('../controllers/slot.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/:slotId/hold', protect, holdSlot);
router.post('/:slotId/release', protect, releaseSlot);

module.exports = router;
