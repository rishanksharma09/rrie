import Assignment from '../models/Assignment.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get all bookings for the logged in user
// @route   GET /api/assignments/my-bookings
// @access  Private
export const getMyBookings = asyncHandler(async (req, res) => {
    const patientId = req.user.uid;

    const bookings = await Assignment.find({ patientId })
        .populate('assignedAmbulance.id')
        .populate('assignedHospital.id')
        .sort({ createdAt: -1 });

    res.json(bookings);
});

// @desc    Get detailed assignment info
// @route   GET /api/assignments/:id
// @access  Private
export const getAssignmentById = asyncHandler(async (req, res) => {
    const assignment = await Assignment.findById(req.params.id)
        .populate('assignedAmbulance.id')
        .populate('assignedHospital.id');

    if (!assignment) {
        res.status(404);
        throw new Error('Assignment not found');
    }

    // Ensure user owns this assignment
    if (assignment.patientId !== req.user.uid) {
        res.status(401);
        throw new Error('Not authorized to view this assignment');
    }

    res.json(assignment);
});
