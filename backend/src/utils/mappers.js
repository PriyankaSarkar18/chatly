/** Shapes a users table row into a safe API object (never leaks password_hash). */
export const publicUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    phone: row.phone,
    about: row.about,
    avatarUrl: row.avatar_url,
    isOnline: Boolean(row.is_online),
    lastSeen: row.last_seen,
    createdAt: row.created_at,
  };
};

/** Shapes a message row (joined with sender columns) into an API object. */
export const messageDto = (row) => {
  if (!row) return null;
  const deleted = Boolean(row.deleted_at);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    sender: row.sender_name
      ? { id: row.sender_id, name: row.sender_name, avatarUrl: row.sender_avatar }
      : null,
    type: row.type,
    body: deleted ? null : row.body,
    attachmentUrl: deleted ? null : row.attachment_url,
    attachmentName: row.attachment_name,
    attachmentSize: row.attachment_size,
    deleted,
    readBy: row.read_by ? String(row.read_by).split(',').map(Number) : [],
    createdAt: row.created_at,
  };
};

/** Shapes a calls table row into an API object. */
export const callDto = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    callerId: row.caller_id,
    calleeId: row.callee_id,
    conversationId: row.conversation_id,
    type: row.type,
    status: row.status,
    startedAt: row.started_at,
    answeredAt: row.answered_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    caller: row.caller_name
      ? {
          id: row.caller_id,
          name: row.caller_name,
          avatarUrl: row.caller_avatar,
          username: row.caller_username,
        }
      : null,
    callee: row.callee_name
      ? {
          id: row.callee_id,
          name: row.callee_name,
          avatarUrl: row.callee_avatar,
          username: row.callee_username,
        }
      : null,
  };
};
