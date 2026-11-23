import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import * as statusController from './status.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/feed', statusController.feed);
router.post('/upload', upload.single('media'), statusController.uploadMedia);
router.post('/', statusController.create);
router.get('/:statusId/viewers', statusController.viewers);
router.post('/:statusId/view', statusController.view);
router.delete('/:statusId', statusController.remove);

export default router;
