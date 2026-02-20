import express from 'express';
import { getMyBookings, getAssignmentById } from '../controllers/assignmentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All assignment routes are protected

router.get('/my-bookings', getMyBookings);
router.get('/:id', getAssignmentById);

export default router;
