const express = require('express');
const { sendMessage } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/message', protect, sendMessage);

module.exports = router;
