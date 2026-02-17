import express from 'express';
import { getHospitalByEmail, updateHospital } from '../controllers/hospitalController.js';

const router = express.Router();

router.get('/', getHospitalByEmail);
router.put('/', updateHospital);

export default router;
