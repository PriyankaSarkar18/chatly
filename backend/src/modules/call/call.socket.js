import { queryOne } from '../../config/db.js';
import { emitToUser } from '../../sockets/io.js';
import { createCall, getCallById, updateCallStatus } from './call.service.js';

const RING_TIMEOUT_MS = 35 * 1000;

/** callId -> timeout handle, kept in memory so accept/reject/end can cancel the ring. */
const ringTimers = new Map();

const clearRing = (callId) => {
  const timer = ringTimers.get(Number(callId));
  if (timer) {
    clearTimeout(timer);
    ringTimers.delete(Number(callId));
  }
};

const isParticipant = (call, userId) => call && (call.callerId === userId || call.calleeId === userId);
const otherUserId = (call, userId) => (call.callerId === userId ? call.calleeId : call.callerId);

const isUserBusy = async (userId) => {
  const row = await queryOne(
    `SELECT id FROM calls
     WHERE (caller_id = ? OR callee_id = ?)
       AND status IN ('ringing', 'accepted')
       AND started_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
     LIMIT 1`,
    [userId, userId]
  );
  return Boolean(row);
};

const scheduleMissed = (call) => {
  const timer = setTimeout(async () => {
    ringTimers.delete(call.id);
    try {
      const current = await getCallById(call.id);
      if (!current || current.status !== 'ringing') return;
      await updateCallStatus(call.id, 'missed');
      emitToUser(call.callerId, 'call:no-answer', { callId: call.id, call: current });
      emitToUser(call.calleeId, 'call:cancelled', { callId: call.id, reason: 'missed' });
    } catch (error) {
      console.error('[call] ring timeout failed:', error.message);
    }
  }, RING_TIMEOUT_MS);
  ringTimers.set(call.id, timer);
};

/**
 * Registers call signalling for one connected socket.
 * Events: call:start, call:accept, call:reject, call:end, call:signal.
 */
export const registerCallHandlers = (io, socket) => {
  const userId = socket.data.userId;

  socket.on('call:start', async (payload = {}, ack) => {
    try {
      const { calleeId, type = 'audio', conversationId = null } = payload;

      if (await isUserBusy(userId)) {
        return ack?.({ ok: false, message: 'You are already on a call' });
      }
      if (calleeId && (await isUserBusy(calleeId))) {
        return ack?.({ ok: false, message: 'User is busy on another call' });
      }

      const call = await createCall(userId, { calleeId, type, conversationId });
      emitToUser(call.calleeId, 'call:incoming', { call });
      scheduleMissed(call);

      return ack?.({ ok: true, call });
    } catch (error) {
      return ack?.({ ok: false, message: error.message || 'Could not start the call' });
    }
  });

  socket.on('call:accept', async ({ callId } = {}, ack) => {
    try {
      const call = await getCallById(callId);
      if (!isParticipant(call, userId)) return ack?.({ ok: false, message: 'Call not found' });
      if (call.calleeId !== userId) return ack?.({ ok: false, message: 'Only the receiver can accept' });
      if (call.status !== 'ringing') return ack?.({ ok: false, message: `Call is already ${call.status}` });

      clearRing(call.id);
      const updated = await updateCallStatus(call.id, 'accepted');
      emitToUser(call.callerId, 'call:accepted', { call: updated });
      return ack?.({ ok: true, call: updated });
    } catch (error) {
      return ack?.({ ok: false, message: error.message || 'Could not accept the call' });
    }
  });

  socket.on('call:reject', async ({ callId } = {}, ack) => {
    try {
      const call = await getCallById(callId);
      if (!isParticipant(call, userId)) return ack?.({ ok: false, message: 'Call not found' });

      clearRing(call.id);
      const updated = await updateCallStatus(call.id, 'rejected');
      emitToUser(otherUserId(call, userId), 'call:rejected', { call: updated });
      return ack?.({ ok: true, call: updated });
    } catch (error) {
      return ack?.({ ok: false, message: error.message || 'Could not reject the call' });
    }
  });

  socket.on('call:end', async ({ callId, durationSeconds } = {}, ack) => {
    try {
      const call = await getCallById(callId);
      if (!isParticipant(call, userId)) return ack?.({ ok: false, message: 'Call not found' });

      clearRing(call.id);
      const updated = await updateCallStatus(call.id, 'ended', { durationSeconds });
      emitToUser(otherUserId(call, userId), 'call:ended', { call: updated, endedBy: userId });
      return ack?.({ ok: true, call: updated });
    } catch (error) {
      return ack?.({ ok: false, message: error.message || 'Could not end the call' });
    }
  });

  socket.on('call:signal', async ({ callId, targetUserId, signal } = {}, ack) => {
    try {
      const call = await getCallById(callId);
      if (!isParticipant(call, userId)) return ack?.({ ok: false, message: 'Call not found' });

      const peerId = Number(targetUserId) || otherUserId(call, userId);
      if (peerId !== otherUserId(call, userId)) {
        return ack?.({ ok: false, message: 'Invalid signalling target' });
      }

      emitToUser(peerId, 'call:signal', { callId: call.id, fromUserId: userId, signal });
      return ack?.({ ok: true });
    } catch (error) {
      return ack?.({ ok: false, message: error.message || 'Signalling failed' });
    }
  });
};

/** Ends any live call a disconnecting user was part of, so the peer is not left hanging. */
export const releaseUserCalls = async (userId) => {
  const rows = await queryOne(
    `SELECT id FROM calls
     WHERE (caller_id = ? OR callee_id = ?)
       AND status IN ('ringing', 'accepted')
       AND started_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
     LIMIT 1`,
    [userId, userId]
  );
  if (!rows) return;

  clearRing(rows.id);
  const call = await updateCallStatus(rows.id, 'ended');
  if (!call) return;
  emitToUser(otherUserId(call, userId), 'call:ended', { call, endedBy: userId, reason: 'disconnected' });
};
