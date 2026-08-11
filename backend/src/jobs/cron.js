const cron = require('node-cron');
const Booking = require('../models/Booking');

cron.schedule('* * * * *', async () => {
  try {
    const currentTime = new Date();
    const fifteenMinsAgo = new Date(currentTime.getTime() - 15 * 60000);
    
    await Booking.updateMany(
      { status: 'PENDING', createdAt: { $lt: fifteenMinsAgo } },
      { $set: { status: 'CANCELLED', cancellationReason: 'Payment timeout' } }
    );

  } catch (error) {
    console.error('Error running cron job:', error);
  }
});

module.exports = () => {
  console.log('Cron jobs initialized');
};
