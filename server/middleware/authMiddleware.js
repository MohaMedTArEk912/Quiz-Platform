import { User } from '../models/User.js';

import jwt from 'jsonwebtoken';
import { resolveJwtSecret } from '../utils/jwtSecret.js';

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
    
    const decoded = jwt.verify(token, resolveJwtSecret());
    
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
    console.log('🔐 Verifying admin access...');
    // Use verifyUser logic first (composition would be better, but repeating for clarity as per tools limitation)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No authorization header found');
      return res.status(401).json({ message: 'Unauthorized: Admin token required' });
    }

    const token = authHeader.split(' ')[1];
    
    console.log('🔍 Verifying JWT token...');
    const decoded = jwt.verify(token, resolveJwtSecret());

    console.log(`👤 Looking up user: ${decoded.userId}`);
    const adminUser = await User.findOne({ userId: decoded.userId });
    if (!adminUser) {
      console.log('❌ User not found in database');
      return res.status(404).json({ message: 'Authorized user not found' });
    }
    if (adminUser.role !== 'admin') {
      console.log(`❌ User ${decoded.userId} is not an admin (role: ${adminUser.role})`);
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action' });
    }
    console.log(`✅ Admin verified: ${adminUser.userId}`);
    req.admin = adminUser;
    next();
  } catch (error) {
     console.error('❌ Admin verification error:', error.message);
     if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Authorization error', error: error.message });
  }
};
