import express from 'express';
import { verifyRole } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

router.use(protect); // Protect all auth routes

router.post('/verify', authLimiter,verifyRole);

export default router;
