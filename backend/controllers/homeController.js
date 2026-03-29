const getHome = (req, res) => {
    res.status(200).json({ message: 'API is running...' });
};

const getTest = (req, res) => {
    res.status(200).json({ message: 'Test route functionality' });
};

const getProtected = (req, res) => {
    res.status(200).json({
        message: 'Access granted to protected route',
        user: req.user
    });
};

const debugSentry = (req, res) => {
    throw new Error("My first Sentry error!");
};

export { getHome, getTest, getProtected, debugSentry };
