const Parking = require('../../models/Parking');
const Booking = require('../../models/Booking');

exports.tools = [
  {
    type: "function",
    function: {
      name: "searchParking",
      description: "Search for parking facilities near a specific location or keyword.",
      parameters: {
        type: "object",
        properties: {
          locationQuery: { type: "string", description: "The location to search for (e.g., 'Gandhipuram')" }
        },
        required: ["locationQuery"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getMyBookings",
      description: "Get the current user's bookings.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "explainDynamicPricing",
      description: "Explains why the price of a parking slot is a certain amount based on current peak rules.",
      parameters: { 
        type: "object", 
        properties: {
          parkingId: { type: "string" },
          slotId: { type: "string" },
          startTime: { type: "string", description: "HH:MM format" },
          endTime: { type: "string", description: "HH:MM format" }
        },
        required: ["parkingId", "slotId", "startTime", "endTime"]
      }
    }
  }
];

exports.executeTool = async (name, args, user) => {
  try {
    switch (name) {
      case 'searchParking':
        const regex = new RegExp(args.locationQuery, 'i');
        const parkings = await Parking.find({ $or: [{ name: regex }, { address: regex }] }).limit(5);
        return JSON.stringify(parkings);
        
      case 'getMyBookings':
        if (user.role !== 'COMMUTER') return JSON.stringify({ error: "Only commuters have bookings." });
        const bookings = await Booking.find({ userId: user.id }).populate('parkingId', 'name address');
        return JSON.stringify(bookings);

      case 'explainDynamicPricing':
        const { calculateDynamicPrice } = require('./pricing.service');
        const ParkingSlot = require('../../models/ParkingSlot');
        
        const slot = await ParkingSlot.findById(args.slotId);
        if (!slot) return JSON.stringify({ error: "Slot not found" });

        const pricingInfo = await calculateDynamicPrice(args.parkingId, slot.pricePerHour, args.startTime, args.endTime, 0);
        return JSON.stringify(pricingInfo);

      default:
        return JSON.stringify({ error: `Tool ${name} not found.` });
    }
  } catch (err) {
    return JSON.stringify({ error: err.message });
  }
};
