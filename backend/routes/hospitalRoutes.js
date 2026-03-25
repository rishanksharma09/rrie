import express from 'express';
import { getHospitalByEmail, updateHospital, getAllHospitals } from '../controllers/hospitalController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // Protect all hospital routes

router.get('/', getHospitalByEmail);
router.get('/all', getAllHospitals);
router.put('/', updateHospital);

export default router;
