import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { fileUrl } from '../../middleware/upload.js';
import * as profileService from './profile.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile(req.userId, req.userId);
  res.json({ success: true, data: { profile } });
});

export const getById = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile(Number(req.params.userId), req.userId);
  res.json({ success: true, data: { profile } });
});

export const search = asyncHandler(async (req, res) => {
  const users = await profileService.searchUsers(req.userId, req.query.q ?? '', req.query.limit);
  res.json({ success: true, data: { users } });
});

export const update = asyncHandler(async (req, res) => {
  const { name, about, phone } = req.body ?? {};
  if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
    throw ApiError.badRequest('Name must be at least 2 characters');
  }
  if (about !== undefined && String(about).length > 160) {
    throw ApiError.badRequest('About must be 160 characters or less');
  }

  const profile = await profileService.updateProfile(req.userId, {
    name: name?.trim(),
    about: about?.trim(),
    phone: phone?.trim(),
  });
  res.json({ success: true, message: 'Profile updated', data: { profile } });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');

  const profile = await profileService.updateAvatar(req.userId, fileUrl(req.file));
  res.json({ success: true, message: 'Photo updated', data: { profile } });
});
