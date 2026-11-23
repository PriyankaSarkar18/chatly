import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { fileUrl } from '../../middleware/upload.js';
import * as statusService from './status.service.js';

export const feed = asyncHandler(async (req, res) => {
  const statuses = await statusService.getStatusFeed(req.userId);
  res.json({ success: true, data: { statuses } });
});

export const create = asyncHandler(async (req, res) => {
  const status = await statusService.createStatus(req.userId, req.body ?? {});
  res.status(201).json({ success: true, message: 'Status posted', data: { status } });
});

export const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image for your status');
  res.status(201).json({ success: true, data: { mediaUrl: fileUrl(req.file) } });
});

export const view = asyncHandler(async (req, res) => {
  const result = await statusService.viewStatus(req.userId, req.params.statusId);
  res.json({ success: true, data: result });
});

export const viewers = asyncHandler(async (req, res) => {
  const result = await statusService.getStatusViewers(req.userId, req.params.statusId);
  res.json({ success: true, data: { viewers: result } });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await statusService.deleteStatus(req.userId, req.params.statusId);
  res.json({ success: true, message: 'Status deleted', data: result });
});
