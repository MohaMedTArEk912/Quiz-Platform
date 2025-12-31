import { User } from '../models/User.js';

// Middleware to verify any authenticated user
export const verifyUser = async (req, res, next) => {
  try {
    const requesterId = req.headers['x-user-id'];
    if (!requesterId) {
      return res.status(401).json({ message: 'Unauthorized: User ID required in headers' });
    }
    const user = await User.findOne({ userId: requesterId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};

// Middleware to verify admin access
export const verifyAdmin = async (req, res, next) => {
  try {
    const requesterId = req.headers['x-user-id'];
    if (!requesterId) {
      return res.status(401).json({ message: 'Unauthorized: Admin user ID required in headers' });
    }
    const adminUser = await User.findOne({ userId: requesterId });
    if (!adminUser) {
      return res.status(404).json({ message: 'Authorized user not found' });
    }
    if (adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action' });
    }
    req.admin = adminUser;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Authorization error', error: error.message });
  }
};
