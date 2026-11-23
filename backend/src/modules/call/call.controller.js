import * as callService from './call.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const history = asyncHandler(async (req, res) => {
  const calls = await callService.getCallHistory(req.userId, {
    type: 'audio',
    limit: req.query.limit,
  });
  res.json({ success: true, data: { calls } });
});

export const iceServers = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: callService.getIceServers() });
});

export const getOne = asyncHandler(async (req, res) => {
  const call = await callService.assertCallParticipant(req.params.callId, req.userId);
  res.json({ success: true, data: { call } });
});
