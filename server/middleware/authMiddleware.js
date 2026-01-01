import { User } from '../models/User.js';

import jwt from 'jsonwebtoken';

// Middleware to verify any authenticated user
export const verifyUser = async (req, res, next) => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Fallback for legacy x-user-id (warn or deprecate?)
      // For security, strict JWT is better.
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};

// Middleware to verify admin access
export const verifyAdmin = async (req, res, next) => {
  try {
    // Use verifyUser logic first (composition would be better, but repeating for clarity as per tools limitation)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Admin token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    const adminUser = await User.findOne({ userId: decoded.userId });
    if (!adminUser) {
      return res.status(404).json({ message: 'Authorized user not found' });
    }
    if (adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action' });
    }
    req.admin = adminUser;
    next();
  } catch (error) {
     if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Authorization error', error: error.message });
  }
};
