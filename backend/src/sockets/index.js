const { Server } = require('socket.io');

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_parking', (parkingId) => {
      socket.join(parkingId);
      console.log(`User ${socket.id} joined room ${parkingId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  global.io = io;
};

module.exports = initSocket;
