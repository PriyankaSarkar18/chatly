import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import * as chatController from './chat.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/conversations', chatController.listConversations);
router.post('/conversations/direct', chatController.createDirect);
router.post('/conversations/group', chatController.createGroup);
router.get('/conversations/:conversationId', chatController.getConversation);
router.patch('/conversations/:conversationId', chatController.updateGroup);
router.delete('/conversations/:conversationId/leave', chatController.leaveConversation);
router.get('/conversations/:conversationId/messages', chatController.listMessages);
router.post('/conversations/:conversationId/messages', chatController.sendMessage);
router.post('/conversations/:conversationId/read', chatController.markRead);
router.post('/conversations/:conversationId/attachments', upload.single('file'), chatController.uploadAttachment);
router.delete('/messages/:messageId', chatController.removeMessage);

export default router;
