import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import * as profileController from './profile.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', profileController.getMe);
router.get('/search', profileController.search);
router.put('/', profileController.update);
router.put('/avatar', upload.single('avatar'), profileController.uploadAvatar);
router.get('/:userId', profileController.getById);

export default router;
