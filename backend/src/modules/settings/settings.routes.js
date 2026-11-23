import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as settingsController from './settings.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/password', settingsController.changePassword);

export default router;
