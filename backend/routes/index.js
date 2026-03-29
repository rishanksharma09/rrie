import express from 'express';
import { getHome, getTest, getProtected, debugSentry } from '../controllers/homeController.js';
import symptomRoutes from './symptomRoutes.js';
import authRoutes from './authRoutes.js';
import hospitalRoutes from './hospitalRoutes.js';
import assignmentRoutes from './assignmentRoutes.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getHome);
router.get('/test', getTest);
router.get('/protected', protect, getProtected);
router.get('/debug-sentry', debugSentry);
router.use('/symptoms', symptomRoutes);
router.use('/auth', authRoutes);
router.use('/hospital', hospitalRoutes);
router.use('/assignments', assignmentRoutes);

export default router;
