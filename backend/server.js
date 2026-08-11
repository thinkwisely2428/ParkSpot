require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initSocket = require('./src/sockets');
const initCronJobs = require('./src/jobs/cron');

// Connect to database
console.log('Connecting to:', process.env.MONGO_URI);
connectDB();

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Initialize Cron Jobs
initCronJobs();

// Start server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
