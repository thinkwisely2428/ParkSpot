const PricingRule = require('../models/PricingRule');

/**
 * Parses "HH:MM" into minutes from midnight for easy comparison
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Formats minutes from midnight back to "HH:MM"
 */
const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Calculates the total cost for a booking, breaking it into segments based on time rules.
 */
exports.calculateDynamicPrice = async (parkingId, basePrice, startStr, endStr, currentOccupancyPercent = 0) => {
  const rules = await PricingRule.find({ parkingId, isActive: true });
  
  const startMins = timeToMinutes(startStr);
  const endMins = timeToMinutes(endStr);
  
  let segments = [];
  let totalCost = 0;

  // We will iterate hour by hour to simplify segmentation for now.
  // In a real production scenario, this could be more granular (minute by minute).
  for (let current = startMins; current < endMins; current += 60) {
    const nextHour = Math.min(current + 60, endMins);
    const durationHours = (nextHour - current) / 60;
    
    let segmentPrice = basePrice;
    let appliedRuleName = "Normal";
    let isPeak = false;

    // Apply rules
    for (const rule of rules) {
      let ruleApplies = false;
      
      if (rule.type === 'TIME_BASED') {
        const ruleStart = timeToMinutes(rule.startTime);
        const ruleEnd = timeToMinutes(rule.endTime);
        // If this current hour falls within the rule block
        if (current >= ruleStart && current < ruleEnd) {
          ruleApplies = true;
        }
      } else if (rule.type === 'OCCUPANCY_BASED') {
        if (currentOccupancyPercent >= rule.minOccupancyPercent && currentOccupancyPercent <= rule.maxOccupancyPercent) {
          ruleApplies = true;
        }
      }

      if (ruleApplies) {
        if (rule.fixedPriceOverride) {
          segmentPrice = rule.fixedPriceOverride;
        } else if (rule.priceMultiplier) {
          segmentPrice = basePrice * rule.priceMultiplier;
        }
        appliedRuleName = rule.name;
        isPeak = rule.priceMultiplier > 1 || rule.fixedPriceOverride > basePrice;
      }
    }

    const segmentCost = segmentPrice * durationHours;
    totalCost += segmentCost;
    
    segments.push({
      start: minutesToTime(current),
      end: minutesToTime(nextHour),
      pricePerHour: segmentPrice,
      ruleApplied: appliedRuleName,
      isPeak
    });
  }

  return {
    basePrice,
    segments,
    total: Math.round(totalCost * 100) / 100
  };
};
