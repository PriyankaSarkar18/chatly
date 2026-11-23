import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as vcallController from './vcall.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/history', vcallController.history);
router.get('/ice-servers', vcallController.iceServers);
router.get('/:callId', vcallController.getOne);

export default router;
