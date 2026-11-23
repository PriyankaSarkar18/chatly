import { execute, query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { callDto } from '../../utils/mappers.js';
import { findDirectConversation } from '../chat/chat.service.js';

const CALL_SELECT = `
  SELECT c.*,
         caller.name AS caller_name, caller.username AS caller_username, caller.avatar_url AS caller_avatar,
         callee.name AS callee_name, callee.username AS callee_username, callee.avatar_url AS callee_avatar
  FROM calls c
  JOIN users caller ON caller.id = c.caller_id
  JOIN users callee ON callee.id = c.callee_id`;

export const getCallById = async (callId) => {
  const id = Number.parseInt(callId, 10);
  if (!id) return null;
  return callDto(await queryOne(`${CALL_SELECT} WHERE c.id = ?`, [id]));
};

export const assertCallParticipant = async (callId, userId) => {
  const call = await getCallById(callId);
  if (!call) throw ApiError.notFound('Call not found');
  if (call.callerId !== userId && call.calleeId !== userId) {
    throw ApiError.forbidden('You are not part of this call');
  }
  return call;
};

export const createCall = async (callerId, { calleeId, type = 'audio', conversationId = null } = {}) => {
  const callee = Number.parseInt(calleeId, 10);
  if (!callee) throw ApiError.badRequest('Choose someone to call');
  if (callee === callerId) throw ApiError.badRequest('You cannot call yourself');

  const exists = await queryOne('SELECT id FROM users WHERE id = ?', [callee]);
  if (!exists) throw ApiError.notFound('User not found');

  const callType = type === 'video' ? 'video' : 'audio';

  let conversation = conversationId ? Number.parseInt(conversationId, 10) : null;
  if (!conversation) conversation = await findDirectConversation(callerId, callee);

  const result = await execute(
    `INSERT INTO calls (caller_id, callee_id, conversation_id, type, status)
     VALUES (?, ?, ?, ?, 'ringing')`,
    [callerId, callee, conversation || null, callType]
  );

  return getCallById(result.insertId);
};

export const updateCallStatus = async (callId, status, { durationSeconds } = {}) => {
  const call = await getCallById(callId);
  if (!call) throw ApiError.notFound('Call not found');

  const allowed = ['accepted', 'rejected', 'missed', 'ended'];
  if (!allowed.includes(status)) throw ApiError.badRequest('Invalid call status');

  const duration = Math.max(0, Math.min(Number.parseInt(durationSeconds, 10) || 0, 60 * 60 * 8));

  if (status === 'accepted') {
    await execute("UPDATE calls SET status = 'accepted', answered_at = NOW() WHERE id = ?", [call.id]);
  } else if (status === 'ended') {
    await execute(
      `UPDATE calls
       SET status = 'ended',
           ended_at = NOW(),
           duration_seconds = CASE
             WHEN answered_at IS NULL THEN 0
             WHEN ? > 0 THEN ?
             ELSE TIMESTAMPDIFF(SECOND, answered_at, NOW())
           END
       WHERE id = ?`,
      [duration, duration, call.id]
    );
  } else {
    await execute('UPDATE calls SET status = ?, ended_at = NOW() WHERE id = ?', [status, call.id]);
  }

  return getCallById(call.id);
};

export const getCallHistory = async (userId, { type, limit = 60 } = {}) => {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 60, 1), 100);
  const params = [userId, userId];
  let typeClause = '';

  if (type === 'audio' || type === 'video') {
    typeClause = 'AND c.type = ?';
    params.push(type);
  }

  const rows = await query(
    `${CALL_SELECT}
     WHERE (c.caller_id = ? OR c.callee_id = ?) ${typeClause}
     ORDER BY c.started_at DESC
     LIMIT ${safeLimit}`,
    params
  );

  return rows.map(callDto);
};

export const getIceServers = () => ({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
});
