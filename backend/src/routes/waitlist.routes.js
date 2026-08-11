const express = require('express');
const { joinWaitlist, getPosition, leaveWaitlist } = require('../controllers/waitlist.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect); // All waitlist routes are protected

router.post('/', joinWaitlist);
router.get('/:parkingId/position', getPosition);
router.delete('/:parkingId', leaveWaitlist);

module.exports = router;
