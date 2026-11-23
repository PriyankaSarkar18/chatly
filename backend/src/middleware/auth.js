import { queryOne } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.headers['x-auth-token']) return String(req.headers['x-auth-token']);
  return null;
};

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication token is missing');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired, please sign in again');
  }

  const user = await queryOne(
    'SELECT id, name, username, email, phone, about, avatar_url, is_online, last_seen, created_at FROM users WHERE id = ?',
    [payload.sub]
  );
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  req.user = user;
  req.userId = user.id;
  next();
});
