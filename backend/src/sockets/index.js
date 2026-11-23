import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { execute, query, queryOne } from '../config/db.js';
import { verifyToken } from '../utils/token.js';
import { setIo, userRoom, conversationRoom } from './io.js';
import * as chatService from '../modules/chat/chat.service.js';
import { registerCallHandlers, releaseUserCalls } from '../modules/call/call.socket.js';

/** userId -> Set of socket ids, so multiple tabs keep a single presence state. */
const onlineSockets = new Map();

const ackError = (ack, error, fallback = 'Something went wrong') =>
  ack?.({ ok: false, message: error?.message || fallback });

export const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
    maxHttpBufferSize: 1e6,
  });

  setIo(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));

      const payload = verifyToken(token);
      const user = await queryOne('SELECT id, name FROM users WHERE id = ?', [payload.sub]);
      if (!user) return next(new Error('Account not found'));

      socket.data.userId = user.id;
      socket.data.name = user.name;
      return next();
    } catch {
      return next(new Error('Session expired, please sign in again'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    socket.join(userRoom(userId));

    const memberships = await query('SELECT conversation_id FROM conversation_members WHERE user_id = ?', [userId]).catch(
      () => []
    );
    memberships.forEach((row) => socket.join(conversationRoom(row.conversation_id)));

    const open = onlineSockets.get(userId) ?? new Set();
    open.add(socket.id);
    onlineSockets.set(userId, open);

    if (open.size === 1) {
      await execute('UPDATE users SET is_online = 1 WHERE id = ?', [userId]).catch(() => {});
      io.emit('presence:update', { userId, isOnline: true, lastSeen: null });
    }

    socket.emit('presence:ready', { userId, onlineUserIds: [...onlineSockets.keys()] });
    registerCallHandlers(io, socket);

    socket.on('conversation:join', async ({ conversationId } = {}, ack) => {
      try {
        const id = Number.parseInt(conversationId, 10);
        if (!id) return ack?.({ ok: false, message: 'Invalid conversation' });
        await chatService.assertMember(id, userId);
        socket.join(conversationRoom(id));
        return ack?.({ ok: true });
      } catch (error) {
        return ackError(ack, error, 'Could not join conversation');
      }
    });

    socket.on('chat:send', async (payload = {}, ack) => {
      try {
        const message = await chatService.sendMessage(payload.conversationId, userId, payload);
        return ack?.({ ok: true, message });
      } catch (error) {
        return ackError(ack, error, 'Message could not be sent');
      }
    });

    socket.on('chat:read', async ({ conversationId, messageId } = {}, ack) => {
      try {
        const result = await chatService.markConversationRead(conversationId, userId, messageId);
        return ack?.({ ok: true, ...result });
      } catch (error) {
        return ackError(ack, error, 'Could not mark as read');
      }
    });

    socket.on('chat:typing', async ({ conversationId, isTyping } = {}, ack) => {
      try {
        await chatService.broadcastTyping(conversationId, userId, isTyping);
        return ack?.({ ok: true });
      } catch (error) {
        return ackError(ack, error, 'Typing indicator failed');
      }
    });

    socket.on('disconnect', async () => {
      const sockets = onlineSockets.get(userId);
      sockets?.delete(socket.id);

      if (sockets && sockets.size > 0) return;

      onlineSockets.delete(userId);
      const lastSeen = new Date().toISOString();
      await execute('UPDATE users SET is_online = 0, last_seen = NOW() WHERE id = ?', [userId]).catch(() => {});
      io.emit('presence:update', { userId, isOnline: false, lastSeen });

      await releaseUserCalls(userId).catch(() => {});
    });
  });

  return io;
};
