import { execute, query, queryOne, withTransaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { messageDto, publicUser } from '../../utils/mappers.js';
import { emitToUsers, getIo } from '../../sockets/io.js';

const MESSAGE_TYPES = ['text', 'image', 'file', 'audio'];
const MAX_MESSAGE_LENGTH = 5000;

const toIntId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
};

export const assertMember = async (conversationId, userId) => {
  const id = toIntId(conversationId);
  if (!id) throw ApiError.badRequest('Invalid conversation id');

  const membership = await queryOne(
    'SELECT id, role, last_read_message_id FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
    [id, userId]
  );
  if (!membership) throw ApiError.forbidden('You are not a member of this conversation');
  return { conversationId: id, ...membership };
};

export const findDirectConversation = async (userA, userB) => {
  const row = await queryOne(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ?
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = ?
     WHERE c.type = 'direct'
     LIMIT 1`,
    [userA, userB]
  );
  return row?.id ?? null;
};

const memberUsers = async (conversationIds) => {
  if (!conversationIds.length) return new Map();
  const rows = await query(
    `SELECT cm.conversation_id, cm.role, cm.last_read_message_id,
            u.id, u.name, u.username, u.phone, u.about, u.avatar_url, u.is_online, u.last_seen, u.created_at
     FROM conversation_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id IN (?)
     ORDER BY cm.id ASC`,
    [conversationIds]
  );

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.conversation_id)) map.set(row.conversation_id, []);
    map.get(row.conversation_id).push({ ...publicUser(row), role: row.role, lastReadMessageId: row.last_read_message_id });
  }
  return map;
};

const lastMessages = async (conversationIds) => {
  if (!conversationIds.length) return new Map();
  const rows = await query(
    `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
     FROM messages m
     JOIN (
       SELECT conversation_id, MAX(id) AS id
       FROM messages
       WHERE conversation_id IN (?)
       GROUP BY conversation_id
     ) latest ON latest.id = m.id
     LEFT JOIN users u ON u.id = m.sender_id`,
    [conversationIds]
  );
  return new Map(rows.map((row) => [row.conversation_id, messageDto(row)]));
};

export const mapConversations = async (rows, userId) => {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [membersByConv, lastByConv] = await Promise.all([memberUsers(ids), lastMessages(ids)]);

  return rows.map((row) => {
    const members = membersByConv.get(row.id) ?? [];
    const otherUser = row.type === 'direct' ? members.find((member) => member.id !== userId) ?? null : null;
    return {
      id: row.id,
      type: row.type,
      name: row.type === 'direct' ? otherUser?.name ?? 'Unknown' : row.name ?? 'Group',
      avatarUrl: row.type === 'direct' ? otherUser?.avatarUrl ?? null : row.avatar_url,
      createdBy: row.created_by,
      members,
      otherUser,
      lastMessage: lastByConv.get(row.id) ?? null,
      lastMessageAt: row.last_message_at,
      unreadCount: Number(row.unread_count ?? 0),
      lastReadMessageId: row.last_read_message_id,
      createdAt: row.created_at,
    };
  });
};

const conversationRowsForUser = (userId, extraWhere = '', params = []) =>
  query(
    `SELECT c.*, cm.last_read_message_id,
       (SELECT COUNT(*) FROM messages m
        WHERE m.conversation_id = c.id
          AND m.sender_id <> ?
          AND m.deleted_at IS NULL
          AND m.id > cm.last_read_message_id) AS unread_count
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
     ${extraWhere ? `WHERE ${extraWhere}` : ''}
     ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
    [userId, userId, ...params]
  );

export const listConversations = async (userId) => {
  const rows = await conversationRowsForUser(userId);
  return mapConversations(rows, userId);
};

export const getConversation = async (conversationId, userId) => {
  const membership = await assertMember(conversationId, userId);
  const rows = await conversationRowsForUser(userId, 'c.id = ?', [membership.conversationId]);
  if (!rows.length) throw ApiError.notFound('Conversation not found');
  const [conversation] = await mapConversations(rows, userId);
  return conversation;
};

export const createOrGetDirectConversation = async (userId, otherUserId) => {
  const otherId = toIntId(otherUserId);
  if (!otherId) throw ApiError.badRequest('Invalid user id');
  if (otherId === userId) throw ApiError.badRequest('You cannot start a chat with yourself');

  const other = await queryOne('SELECT id, name FROM users WHERE id = ?', [otherId]);
  if (!other) throw ApiError.notFound('User not found');

  const existingId = await findDirectConversation(userId, otherId);
  if (existingId) {
    const conversation = await getConversation(existingId, userId);
    return { conversation, created: false };
  }

  const conversationId = await withTransaction(async (connection) => {
    const [result] = await connection.query(
      "INSERT INTO conversations (type, created_by) VALUES ('direct', ?)",
      [userId]
    );
    await connection.query(
      "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member'), (?, ?, 'member')",
      [result.insertId, userId, result.insertId, otherId]
    );
    return result.insertId;
  });

  const conversation = await getConversation(conversationId, userId);
  emitToUsers([otherId], 'conversation:new', { conversation });
  return { conversation, created: true };
};

export const createGroupConversation = async (userId, { name, memberIds = [] }) => {
  const cleanName = String(name ?? '').trim();
  if (cleanName.length < 2) throw ApiError.badRequest('Group name must be at least 2 characters');
  if (cleanName.length > 120) throw ApiError.badRequest('Group name is too long');

  const ids = [...new Set([userId, ...memberIds.map(toIntId).filter(Boolean)])];
  if (ids.length < 2) throw ApiError.badRequest('Add at least one other member');

  const placeholders = ids.map(() => '?').join(', ');
  const found = await query(`SELECT id FROM users WHERE id IN (${placeholders})`, ids);
  if (found.length !== ids.length) throw ApiError.badRequest('One or more selected users do not exist');

  const conversationId = await withTransaction(async (connection) => {
    const [result] = await connection.query(
      "INSERT INTO conversations (type, name, created_by, last_message_at) VALUES ('group', ?, ?, NOW())",
      [cleanName, userId]
    );
    const groupId = result.insertId;
    for (const memberId of ids) {
      await connection.query(
        'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)',
        [groupId, memberId, memberId === userId ? 'admin' : 'member']
      );
    }
    await connection.query(
      "INSERT INTO messages (conversation_id, sender_id, type, body) VALUES (?, ?, 'system', ?)",
      [groupId, userId, `${cleanName} group created`]
    );
    await connection.query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [groupId]);
    return groupId;
  });

  const conversation = await getConversation(conversationId, userId);
  emitToUsers(ids, 'conversation:new', { conversation });
  return conversation;
};

export const updateGroupConversation = async (conversationId, userId, { name }) => {
  const conversation = await getConversation(conversationId, userId);
  if (conversation.type !== 'group') throw ApiError.badRequest('Only groups can be renamed');

  const cleanName = String(name ?? '').trim();
  if (cleanName.length < 2) throw ApiError.badRequest('Group name must be at least 2 characters');

  await execute('UPDATE conversations SET name = ? WHERE id = ?', [cleanName, conversation.id]);
  const updated = await getConversation(conversation.id, userId);
  emitToUsers(conversation.members.map((member) => member.id), 'conversation:updated', { conversation: updated });
  return updated;
};

export const leaveConversation = async (conversationId, userId) => {
  const membership = await assertMember(conversationId, userId);
  const conversation = await getConversation(conversationId, userId);

  await execute('DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [
    membership.conversationId,
    userId,
  ]);

  const remaining = await queryOne(
    'SELECT COUNT(*) AS total FROM conversation_members WHERE conversation_id = ?',
    [membership.conversationId]
  );
  if (!remaining || Number(remaining.total) === 0) {
    await execute('DELETE FROM conversations WHERE id = ?', [membership.conversationId]);
  }

  emitToUsers(
    conversation.members.map((member) => member.id).filter((id) => id !== userId),
    'conversation:left',
    { conversationId: membership.conversationId, userId }
  );
  return { conversationId: membership.conversationId };
};

export const getMessages = async (conversationId, userId, { before, limit } = {}) => {
  const membership = await assertMember(conversationId, userId);
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 40, 1), 100);
  const beforeId = toIntId(before);

  const params = [membership.conversationId];
  let beforeClause = '';
  if (beforeId) {
    beforeClause = 'AND m.id < ?';
    params.push(beforeId);
  }

  const rows = await query(
    `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar,
            (SELECT GROUP_CONCAT(mr.user_id) FROM message_reads mr WHERE mr.message_id = m.id) AS read_by
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ? ${beforeClause}
     ORDER BY m.id DESC
     LIMIT ${safeLimit}`,
    params
  );

  rows.reverse();
  return { messages: rows.map(messageDto), hasMore: rows.length === safeLimit };
};

const fetchMessage = async (messageId) => {
  const row = await queryOne(
    `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar,
            (SELECT GROUP_CONCAT(mr.user_id) FROM message_reads mr WHERE mr.message_id = m.id) AS read_by
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.id = ?`,
    [messageId]
  );
  return messageDto(row);
};

export const sendMessage = async (conversationId, senderId, payload = {}) => {
  const membership = await assertMember(conversationId, senderId);
  const type = MESSAGE_TYPES.includes(payload.type) ? payload.type : 'text';
  const body = payload.body != null ? String(payload.body).trim() : '';
  const attachmentUrl = payload.attachmentUrl ? String(payload.attachmentUrl).slice(0, 255) : null;

  if (type === 'text' && !body) throw ApiError.badRequest('Message cannot be empty');
  if (type !== 'text' && !attachmentUrl) throw ApiError.badRequest('Attachment is required for this message type');
  if (body.length > MAX_MESSAGE_LENGTH) throw ApiError.badRequest('Message is too long');

  const result = await execute(
    `INSERT INTO messages (conversation_id, sender_id, type, body, attachment_url, attachment_name, attachment_size)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      membership.conversationId,
      senderId,
      type,
      body || null,
      attachmentUrl,
      payload.attachmentName ? String(payload.attachmentName).slice(0, 160) : null,
      Number(payload.attachmentSize) || null,
    ]
  );

  await execute('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [membership.conversationId]);
  await execute(
    'UPDATE conversation_members SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?',
    [result.insertId, membership.conversationId, senderId]
  );

  const message = await fetchMessage(result.insertId);
  const members = await query('SELECT user_id FROM conversation_members WHERE conversation_id = ?', [
    membership.conversationId,
  ]);

  emitToUsers(
    members.map((member) => member.user_id),
    'message:new',
    { message }
  );

  return message;
};

export const markConversationRead = async (conversationId, userId, messageId) => {
  const membership = await assertMember(conversationId, userId);
  let targetId = toIntId(messageId);

  if (targetId) {
    const belongs = await queryOne('SELECT id FROM messages WHERE id = ? AND conversation_id = ?', [
      targetId,
      membership.conversationId,
    ]);
    if (!belongs) targetId = null;
  }

  if (!targetId) {
    const latest = await queryOne('SELECT MAX(id) AS maxId FROM messages WHERE conversation_id = ?', [
      membership.conversationId,
    ]);
    targetId = latest?.maxId ?? null;
  }

  if (!targetId) return { conversationId: membership.conversationId, messageId: null };

  await execute(
    'UPDATE conversation_members SET last_read_message_id = GREATEST(last_read_message_id, ?) WHERE conversation_id = ? AND user_id = ?',
    [targetId, membership.conversationId, userId]
  );

  await execute(
    `INSERT IGNORE INTO message_reads (message_id, user_id)
     SELECT id, ? FROM messages
     WHERE conversation_id = ? AND id <= ? AND sender_id <> ? AND deleted_at IS NULL`,
    [userId, membership.conversationId, targetId, userId]
  );

  const members = await query('SELECT user_id FROM conversation_members WHERE conversation_id = ?', [
    membership.conversationId,
  ]);

  const payload = {
    conversationId: membership.conversationId,
    userId,
    messageId: targetId,
  };
  emitToUsers(members.map((member) => member.user_id), 'message:read', payload);

  return payload;
};

export const deleteMessage = async (messageId, userId) => {
  const id = toIntId(messageId);
  if (!id) throw ApiError.badRequest('Invalid message id');

  const row = await queryOne('SELECT * FROM messages WHERE id = ?', [id]);
  if (!row) throw ApiError.notFound('Message not found');
  if (row.sender_id !== userId) throw ApiError.forbidden('You can only delete your own messages');

  await execute('UPDATE messages SET deleted_at = NOW() WHERE id = ?', [id]);

  const members = await query('SELECT user_id FROM conversation_members WHERE conversation_id = ?', [
    row.conversation_id,
  ]);
  emitToUsers(
    members.map((member) => member.user_id),
    'message:deleted',
    { messageId: id, conversationId: row.conversation_id }
  );

  return { messageId: id, conversationId: row.conversation_id };
};

/** Emits typing indicators to the other members of a conversation. */
export const broadcastTyping = async (conversationId, userId, isTyping) => {
  const membership = await assertMember(conversationId, userId);
  const user = await queryOne('SELECT id, name FROM users WHERE id = ?', [userId]);
  const members = await query('SELECT user_id FROM conversation_members WHERE conversation_id = ?', [
    membership.conversationId,
  ]);

  getIo()
    ?.to(`conv:${membership.conversationId}`)
    .except(`user:${userId}`)
    .emit('typing', {
      conversationId: membership.conversationId,
      userId,
      name: user?.name ?? 'Someone',
      isTyping: Boolean(isTyping),
    });

  return { members, conversationId: membership.conversationId };
};

export const listConversationMembers = async (conversationId) =>
  query('SELECT user_id FROM conversation_members WHERE conversation_id = ?', [conversationId]);
