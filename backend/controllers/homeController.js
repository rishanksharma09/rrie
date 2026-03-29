const getHome = (req, res) => {
    res.json({ message: 'API is running...' });
};

const getTest = (req, res) => {
    res.json({ message: 'Test route functionality' });
};

const getProtected = (req, res) => {
    res.json({
        message: 'Access granted to protected route',
        user: req.user
    });
};

const debugSentry = (req, res) => {
    throw new Error("My first Sentry error!");
};

export { getHome, getTest, getProtected, debugSentry };
