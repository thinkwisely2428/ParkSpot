const express = require('express');
const { getP2PListings, createP2PListing, addP2PReview } = require('../controllers/p2p.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.route('/')
  .get(getP2PListings)
  .post(createP2PListing);

router.route('/:id/review')
  .post(addP2PReview);

module.exports = router;
