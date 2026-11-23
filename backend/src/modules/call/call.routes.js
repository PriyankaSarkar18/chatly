import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as callController from './call.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/history', callController.history);
router.get('/ice-servers', callController.iceServers);
router.get('/:callId', callController.getOne);

export default router;
