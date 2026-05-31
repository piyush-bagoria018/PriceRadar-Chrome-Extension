import { Router } from 'express';
import {
  trackExternalProduct,
  getExternalAlerts,
  getExternalAnalysis,
  getExternalHistory,
  createExternalAlert,
} from '../controllers/priceTracking.controller.js';

const router = Router();

router.post('/track', trackExternalProduct);
router.get('/alerts', getExternalAlerts);
router.get('/:identifier/analysis', getExternalAnalysis);
router.get('/:identifier/history', getExternalHistory);
router.post('/:identifier/alert', createExternalAlert);

export default router;
