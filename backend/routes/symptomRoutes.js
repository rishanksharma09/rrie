import express from 'express';
import { analyzeSymptoms } from '../controllers/symptomController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { strictLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

router.post('/analyze',strictLimiter, protect, analyzeSymptoms);

export default router;
