import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Helper: Generate JWT
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
};

// Helper function to calculate login streak
const calculateStreak = (lastLoginDate, currentStreak) => {
  if (!lastLoginDate) {
    return 1; // First login ever
  }

  const now = new Date();
  const lastLogin = new Date(lastLoginDate);
  
  // Reset time to midnight for both dates to compare days only
  now.setHours(0, 0, 0, 0);
  lastLogin.setHours(0, 0, 0, 0);
  
  const diffTime = now - lastLogin;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Same day - maintain current streak
    return currentStreak || 1;
  } else if (diffDays === 1) {
    // Consecutive day - increment streak
    return (currentStreak || 0) + 1;
  } else {
    // Missed days - reset streak
    return 1;
  }
};

export const register = async (req, res) => {
  try {
    const { userId, name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      userId,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    });

    await newUser.save();
    
    // Generate Token
    const token = generateToken(newUser.userId, newUser.role || 'user');

    res.status(201).json({ user: newUser, token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Calculate and update login streak
    const newStreak = calculateStreak(user.lastLoginDate, user.streak);
    user.streak = newStreak;
    user.lastLoginDate = new Date();
    await user.save();

    // Generate Token
    const token = generateToken(user.userId, user.role || 'user');

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      // Create new user with Google account
      const userId = normalizedEmail.replace(/[^a-z0-9]/g, '_');
      user = new User({
        userId,
        name,
        email: normalizedEmail,
        password: googleId, // Use Google ID as password (they won't use it for login)
        totalScore: 0,
        totalAttempts: 0,
        totalTime: 0,
        xp: 0,
        level: 1,
        streak: 1, // First login
        lastLoginDate: new Date(),
        badges: []
      });
      await user.save();
    } else {
      // Existing user - calculate and update streak
      const newStreak = calculateStreak(user.lastLoginDate, user.streak);
      user.streak = newStreak;
      user.lastLoginDate = new Date();
      await user.save();
    }
    
    // Generate Token for Google User
    const token = generateToken(user.userId, user.role || 'user');
    
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const verifySession = async (req, res) => {
  try {
    // For backwards compatibility/session check, we can rely on the middleware to have verified the token
    // But if this route is used to *validate* a stored token on client reload:
    
    // In a stateless JWT flow, "verifying session" is just "is my token valid?"
    // The client should send the token in the header.
    // If we're here, it means the token MIGHT be in the body (if that's how the client sends it) 
    // OR we should just trust the middleware if we add it to this route.
    
    // Assuming we update the frontend to check validaty by hitting a protected route
    // Or we decode the token here if sent in body.

    // Let's assume the client sends { token }
    const { token } = req.body;
    if (!token) return res.status(401).json({ valid: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findOne({ userId: decoded.userId });

    if (!user) return res.status(404).json({ valid: false });

    res.json({
      valid: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address' });
        }
        
        // In a real app, you would send an email with a reset token
        // For now, we'll just confirm the email exists and allow direct reset
        res.json({ 
            message: 'Email verified. You can now reset your password.',
            userId: user.userId 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.password = newPassword; // In production, hash this!
        await user.save();
        
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }
        
        // Find user (works for both regular users and admin)
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Verify current password
        if (user.password !== currentPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        // Update password
        user.password = newPassword; // In production, hash this!
        await user.save();
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password', error: error.message });
    }
};

export const adminChangeUserPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.password = newPassword; // In production, hash this!
        await user.save();
        
        res.json({ message: 'User password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing user password', error: error.message });
    }
};
