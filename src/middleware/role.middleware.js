/**
 * Middleware to restrict access based on user role
 * @param {string[]} roles - Array of allowed roles (e.g. ['doctor', 'patient'])
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User not authenticated.',
            });
        }

        console.log('User Role:', req.user.role);

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Requires one of the following roles: ${roles.join(', ')}`,
            });
        }

        next();
    };
};

module.exports = { authorize };
