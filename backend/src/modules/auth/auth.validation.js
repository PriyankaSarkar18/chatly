import { ApiError } from '../../utils/ApiError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

const requireString = (value, field, { min = 1, max = 255 } = {}) => {
  if (typeof value !== 'string' || !value.trim()) throw ApiError.badRequest(`${field} is required`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw ApiError.badRequest(`${field} must be at least ${min} characters`);
  if (trimmed.length > max) throw ApiError.badRequest(`${field} must be at most ${max} characters`);
  return trimmed;
};

export const validateRegister = (body = {}) => {
  const name = requireString(body.name, 'Name', { min: 2, max: 80 });
  const username = requireString(body.username, 'Username', { min: 3, max: 30 }).toLowerCase();
  const email = requireString(body.email, 'Email', { max: 120 }).toLowerCase();
  const password = requireString(body.password, 'Password', { min: 6, max: 72 });
  const phone = body.phone ? String(body.phone).trim().slice(0, 20) : null;

  if (!USERNAME_RE.test(username)) {
    throw ApiError.badRequest('Username can only contain lowercase letters, numbers, dots and underscores (3-30 chars)');
  }
  if (!EMAIL_RE.test(email)) throw ApiError.badRequest('Enter a valid email address');

  return { name, username, email, password, phone };
};

export const validateLogin = (body = {}) => {
  const identifier = requireString(body.identifier ?? body.email ?? body.username, 'Email or username');
  const password = requireString(body.password, 'Password');
  return { identifier: identifier.toLowerCase(), password };
};
