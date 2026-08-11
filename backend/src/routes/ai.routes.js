const express = require('express');
const { chat, getHistory } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect); // All AI routes are protected

router.post('/chat', chat);
router.get('/history', getHistory);

module.exports = router;
