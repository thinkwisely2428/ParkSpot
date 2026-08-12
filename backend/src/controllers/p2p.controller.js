const P2PListing = require('../models/P2PListing');

// Sample initial mock listings if DB is empty
const INITIAL_P2P_LISTINGS = [
  {
    title: "Spacious Gated Villa Driveway",
    hostName: "Ramesh Kumar",
    hostPhone: "+91 98765 43210",
    description: "Covered 24/7 CCTV driveway in Anna Nagar. Safe for overnight & luxury cars.",
    address: "Plot 14, 2nd Main Rd, Anna Nagar, Chennai",
    spotType: "Driveway",
    allowedVehicles: ["Car", "SUV", "EV Car"],
    pricePerHour: 35,
    startTime: "06:00",
    endTime: "23:00",
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    hostRules: ["No oversized trucks", "Park inside marked lines", "Gate auto-locks at 10 PM"],
    isKycVerified: true,
    isPhotoVerified: true,
    status: "ACTIVE",
    images: ["https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=500&auto=format&fit=crop&q=60"],
    rating: 4.9,
    reviewCount: 28,
    reviews: [
      { userName: "Karthik V.", rating: 5, comment: "Super clean space, host opened gate promptly." },
      { userName: "Santhosh M.", rating: 4.8, comment: "Very safe and convenient location!" }
    ]
  },
  {
    title: "TechPark Neighbor Office Yard",
    hostName: "Priya Sundaram",
    hostPhone: "+91 94440 12345",
    description: "Paved office slot near Tidel Park. EV Charging point available upon request.",
    address: "45 OMR IT Corridor, Taramani, Chennai",
    spotType: "Commercial Yard",
    allowedVehicles: ["Car", "Bike", "EV Car", "SUV"],
    pricePerHour: 45,
    startTime: "08:00",
    endTime: "20:00",
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    hostRules: ["Show QR badge at security desk", "EV Charger extra ₹30/hr"],
    isKycVerified: true,
    isPhotoVerified: true,
    status: "ACTIVE",
    images: ["https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=500&auto=format&fit=crop&q=60"],
    rating: 4.7,
    reviewCount: 19,
    reviews: [
      { userName: "Anand R.", rating: 5, comment: "Saved my commute to office!" }
    ]
  },
  {
    title: "Residential Covered Garage Slot",
    hostName: "Dr. Vijayaraghavan",
    hostPhone: "+91 91234 56789",
    description: "Private lockable garage slot in Nungambakkam. Perfect protection from sun & rain.",
    address: "18 College Road, Nungambakkam, Chennai",
    spotType: "Garage",
    allowedVehicles: ["Car", "Bike"],
    pricePerHour: 30,
    startTime: "07:00",
    endTime: "21:00",
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    hostRules: ["Key stored in lockbox (code sent after booking)", "Keep garage door closed"],
    isKycVerified: true,
    isPhotoVerified: true,
    status: "ACTIVE",
    images: ["https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=500&auto=format&fit=crop&q=60"],
    rating: 4.95,
    reviewCount: 42,
    reviews: [
      { userName: "Deepa N.", rating: 5, comment: "Best spot in Nungambakkam!" }
    ]
  }
];

// @desc    Get all P2P listings
// @route   GET /api/v1/p2p
exports.getP2PListings = async (req, res) => {
  try {
    let listings = await P2PListing.find({ status: 'ACTIVE' }).sort({ rating: -1 });
    
    // Seed initial demo listings if collection is empty
    if (listings.length === 0) {
      const dummyHostId = req.user ? req.user._id : new (require('mongoose').Types.ObjectId)();
      const seeded = INITIAL_P2P_LISTINGS.map(l => ({ ...l, hostId: dummyHostId }));
      listings = await P2PListing.insertMany(seeded);
    }
    
    res.status(200).json({ success: true, count: listings.length, data: listings });
  } catch (error) {
    // Fallback in-memory response if DB operation fails
    res.status(200).json({ success: true, count: INITIAL_P2P_LISTINGS.length, data: INITIAL_P2P_LISTINGS });
  }
};

// @desc    Create a new P2P listing
// @route   POST /api/v1/p2p
exports.createP2PListing = async (req, res) => {
  try {
    const { title, description, address, spotType, allowedVehicles, pricePerHour, startTime, endTime, hostRules } = req.body;
    
    const newListing = await P2PListing.create({
      hostId: req.user ? req.user._id : new (require('mongoose').Types.ObjectId)(),
      hostName: req.user ? req.user.name : "Community Host",
      hostPhone: req.user ? req.user.phone || "+91 99999 88888" : "+91 99999 88888",
      title,
      description,
      address,
      spotType: spotType || "Driveway",
      allowedVehicles: allowedVehicles && allowedVehicles.length ? allowedVehicles : ["Car", "Bike", "SUV"],
      pricePerHour: Number(pricePerHour) || 30,
      startTime: startTime || "06:00",
      endTime: endTime || "22:00",
      hostRules: Array.isArray(hostRules) ? hostRules : (hostRules ? hostRules.split(',').map(r => r.trim()) : ["Follow host instructions"]),
      isKycVerified: true,
      isPhotoVerified: true,
      status: "ACTIVE"
    });

    res.status(201).json({ success: true, data: newListing });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Add review to P2P listing
// @route   POST /api/v1/p2p/:id/review
exports.addP2PReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const listing = await P2PListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

    const newReview = {
      userName: req.user ? req.user.name : "Commuter User",
      rating: Number(rating) || 5,
      comment: comment || "Great P2P parking space!"
    };

    listing.reviews.push(newReview);
    listing.reviewCount = listing.reviews.length;
    listing.rating = Number((listing.reviews.reduce((a, r) => a + r.rating, 0) / listing.reviews.length).toFixed(1));
    await listing.save();

    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
