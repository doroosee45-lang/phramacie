import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '/';
  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect',    () => console.log('Socket connecté:', socket.id));
  socket.on('disconnect', () => console.log('Socket déconnecté'));
  socket.on('connect_error', (e) => console.warn('Socket error:', e.message));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const subscribeToAlerts = (callback) => {
  if (!socket) return;
  socket.on('alert:new', callback);
  return () => socket.off('alert:new', callback);
};

export const subscribeToSales = (callback) => {
  if (!socket) return;
  socket.on('sale:new', callback);
  return () => socket.off('sale:new', callback);
};
