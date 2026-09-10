import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { resolveJwtSecret } from '../utils/jwtSecret.js';

// Middleware to verify any authenticated user
export const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, resolveJwtSecret());
    } catch (jwtErr) {
      return res.status(401).json({
        message: jwtErr.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid authorization token'
      });
    }

    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      message: 'Authentication error',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
};

// Middleware to verify admin access
export const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Admin token required' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, resolveJwtSecret());
    } catch (jwtErr) {
      return res.status(401).json({
        message: jwtErr.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid authorization token'
      });
    }

    const adminUser = await User.findOne({ userId: decoded.userId });
    if (!adminUser) {
      return res.status(404).json({ message: 'Authorized user not found' });
    }

    if (adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action' });
    }

    req.user = adminUser;
    req.admin = adminUser;
    next();
  } catch (error) {
    res.status(500).json({
      message: 'Authorization error',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
};

// Fine-grained Role-Based Access Control (RBAC) helper
export const requireRole = (role) => {
  return (req, res, next) => {
    const user = req.user || req.admin;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (user.role !== role) {
      return res.status(403).json({ message: `Forbidden: Requires ${role} role privileges` });
    }
    next();
  };
};
