import express from 'express';
import { analyzeSymptomsLogic } from '../controllers/symptomController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/analyze', protect, analyzeSymptomsLogic);

export default router;