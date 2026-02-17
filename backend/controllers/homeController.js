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

export { getHome, getTest, getProtected };
