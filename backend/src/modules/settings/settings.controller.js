import * as settingsService from './settings.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings(req.userId);
  res.json({ success: true, data: { settings } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.userId, req.body);
  res.json({ success: true, message: 'Settings saved', data: { settings } });
});

export const changePassword = asyncHandler(async (req, res) => {
  await settingsService.changePassword(req.userId, req.body);
  res.json({ success: true, message: 'Password updated' });
});
