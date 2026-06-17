const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const connectedUsers = new Map();

exports.setupSocket = (io) => {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    connectedUsers.set(socket.userId, socket.id);
    logger.info(`Socket connecté: ${socket.userId}`);

    // Join role-based rooms
    socket.on('join:room', (room) => socket.join(room));

    // Broadcast online users
    io.emit('users:online', connectedUsers.size);

    // Offline sale sync
    socket.on('sale:sync', async (sales) => {
      logger.info(`Sync ${sales.length} ventes hors-ligne de ${socket.userId}`);
      socket.emit('sale:synced', { count: sales.length });
    });

    // Real-time alerts
    socket.on('alert:ack', (alertId) => {
      logger.info(`Alerte acquittée: ${alertId} par ${socket.userId}`);
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);
      io.emit('users:online', connectedUsers.size);
      logger.info(`Socket déconnecté: ${socket.userId}`);
    });
  });
};

exports.emitToUser = (io, userId, event, data) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) io.to(socketId).emit(event, data);
};

exports.getOnlineCount = () => connectedUsers.size;
