import express from 'express';
import { getHospitalByEmail, updateHospital, getAllHospitals } from '../controllers/hospitalController.js';

const router = express.Router();

router.get('/', getHospitalByEmail);
router.get('/all', getAllHospitals);
router.put('/', updateHospital);

export default router;
