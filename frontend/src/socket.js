import { io } from 'socket.io-client';

let socket = null;

/**
 * Returns or initializes a shared Socket.io connection for the frontend application.
 * Automatically transmits the JWT Bearer token if provided in storage or parameters.
 */
export function getSocket(token) {
  const authToken = token || localStorage.getItem('token');

  if (!socket) {
    socket = io('/', {
      autoConnect: true,
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
    });
  } else if (authToken && socket.auth?.token !== authToken) {
    socket.auth = { token: authToken };
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }

  return socket;
}

/**
 * Disconnects the active socket connection on user logout.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
