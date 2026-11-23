import { io } from 'socket.io-client';

let socket = null;

const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

/** Opens (or reopens) the socket with a fresh JWT. */
export const connectSocket = (token) => {
  if (!token) return null;
  if (socket?.connected && socket.auth?.token === token) return socket;

  disconnectSocket();
  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 8,
    reconnectionDelay: 800,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

/** Promise wrapper around socket acks, so UI code can await an emit. */
export const emitAsync = (event, payload, timeout = 12000) =>
  new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('You are offline. Reconnecting…'));
      return;
    }
    socket.timeout(timeout).emit(event, payload, (error, response) => {
      if (error) {
        reject(new Error('The server did not respond in time'));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.message || 'Request failed'));
        return;
      }
      resolve(response);
    });
  });
