// middlewares/auth.js
const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
    const header = req.header('Authorization') || '';
    const token = header.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, auth denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: 'Token invalid' });
    }
};

exports.authorizeAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ message: 'Admin privileges required' });
    }
    next();
};
