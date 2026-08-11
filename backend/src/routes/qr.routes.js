const express = require('express');
const { verifyQR } = require('../controllers/qr.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/verify', protect, authorize('OWNER', 'ADMIN'), verifyQR);

module.exports = router;
