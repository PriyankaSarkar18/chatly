import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';
import { validateLogin, validateRegister } from './auth.validation.js';

export const register = asyncHandler(async (req, res) => {
  const payload = validateRegister(req.body);
  const result = await authService.registerUser(payload);
  res.status(201).json({ success: true, message: 'Account created', data: result });
});

export const login = asyncHandler(async (req, res) => {
  const payload = validateLogin(req.body);
  const result = await authService.loginUser(payload);
  res.json({ success: true, message: 'Welcome back', data: result });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.userId);
  res.json({ success: true, data: { user } });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.setOffline(req.userId);
  res.json({ success: true, message: 'Signed out' });
});
