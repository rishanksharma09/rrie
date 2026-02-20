import express from 'express';
import { analyzeSymptoms } from '../controllers/symptomController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/analyze', protect, analyzeSymptoms);

export default router;
