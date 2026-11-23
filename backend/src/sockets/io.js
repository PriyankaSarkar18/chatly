let ioInstance = null;

export const setIo = (io) => {
  ioInstance = io;
};

export const getIo = () => ioInstance;

/** Emit an event to every open socket of a single user. */
export const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};

/** Emit an event to several users at once. */
export const emitToUsers = (userIds, event, payload) => {
  userIds.filter(Boolean).forEach((id) => emitToUser(id, event, payload));
};

export const userRoom = (userId) => `user:${userId}`;
export const conversationRoom = (conversationId) => `conv:${conversationId}`;
