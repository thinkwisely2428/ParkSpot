const express = require('express');
const router = express.Router();
const { createOrder, verifySignature } = require('../controllers/payment.controller');

router.post('/create-order', createOrder);
router.post('/verify-signature', verifySignature);

module.exports = router;
