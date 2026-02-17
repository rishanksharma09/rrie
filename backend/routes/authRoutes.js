import express from 'express';
import { verifyRole } from '../controllers/authController.js';

const router = express.Router();

router.post('/verify', verifyRole);

export default router;
