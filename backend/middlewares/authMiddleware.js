import admin from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using Firebase Admin
            const decodedToken = await admin.auth().verifyIdToken(token);

            // Attach user information to request object
            req.user = decodedToken;

            next();
        } catch (error) {
            console.error('Auth Error:', error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

export { protect };
