const validateRequest = (req, res, next) => {
    // Add validation logic
    next();
};

const checkRBAC = (roles) => {
    return (req, res, next) => {
        const userRole = req.user.role; // Assume req.user is populated by auth middleware
        if (!roles.includes(userRole)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
};

module.exports = { validateRequest, checkRBAC };