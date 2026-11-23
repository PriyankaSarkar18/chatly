import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { fileUrl } from '../../middleware/upload.js';
import * as chatService from './chat.service.js';

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await chatService.listConversations(req.userId);
  res.json({ success: true, data: { conversations } });
});

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await chatService.getConversation(req.params.conversationId, req.userId);
  res.json({ success: true, data: { conversation } });
});

export const createDirect = asyncHandler(async (req, res) => {
  const { conversation, created } = await chatService.createOrGetDirectConversation(
    req.userId,
    req.body?.userId
  );
  res.status(created ? 201 : 200).json({ success: true, data: { conversation } });
});

export const createGroup = asyncHandler(async (req, res) => {
  const conversation = await chatService.createGroupConversation(req.userId, {
    name: req.body?.name,
    memberIds: Array.isArray(req.body?.memberIds) ? req.body.memberIds : [],
  });
  res.status(201).json({ success: true, message: 'Group created', data: { conversation } });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const conversation = await chatService.updateGroupConversation(
    req.params.conversationId,
    req.userId,
    { name: req.body?.name }
  );
  res.json({ success: true, message: 'Group updated', data: { conversation } });
});

export const leaveConversation = asyncHandler(async (req, res) => {
  const result = await chatService.leaveConversation(req.params.conversationId, req.userId);
  res.json({ success: true, message: 'Left conversation', data: result });
});

export const listMessages = asyncHandler(async (req, res) => {
  const result = await chatService.getMessages(req.params.conversationId, req.userId, {
    before: req.query.before,
    limit: req.query.limit,
  });
  res.json({ success: true, data: result });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await chatService.sendMessage(req.params.conversationId, req.userId, req.body ?? {});
  res.status(201).json({ success: true, data: { message } });
});

export const markRead = asyncHandler(async (req, res) => {
  const result = await chatService.markConversationRead(
    req.params.conversationId,
    req.userId,
    req.body?.messageId
  );
  res.json({ success: true, data: result });
});

export const removeMessage = asyncHandler(async (req, res) => {
  const result = await chatService.deleteMessage(req.params.messageId, req.userId);
  res.json({ success: true, message: 'Message deleted', data: result });
});

export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose a file to upload');

  const type = req.file.mimetype.startsWith('image/')
    ? 'image'
    : req.file.mimetype.startsWith('audio/')
      ? 'audio'
      : 'file';

  res.status(201).json({
    success: true,
    data: {
      attachment: {
        url: fileUrl(req.file),
        name: req.file.originalname,
        size: req.file.size,
        type,
      },
    },
  });
});
