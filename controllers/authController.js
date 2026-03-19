import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateTokens } from '../middleware/auth.js';

export const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      fullName
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Update user with refresh token without triggering full document validation
    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken } }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error?.name === 'MongoServerSelectionError' || error?.name === 'MongoNetworkError') {
      return res.status(503).json({
        message: 'Database temporarily unavailable. Please try again in a moment.',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Registration failed',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    if (!user.password) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check password
    let isPasswordValid = false;
    try {
      isPasswordValid = await user.comparePassword(password);
    } catch (compareError) {
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Update user with refresh token without triggering full document validation
    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken } }
    );

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error?.name === 'MongoServerSelectionError' || error?.name === 'MongoNetworkError') {
      return res.status(503).json({
        message: 'Database temporarily unavailable. Please try again in a moment.',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Login failed',
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { refreshToken: null } }
    );

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Logout failed',
      error: error.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    res.json({
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, avatarUrl } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (fullName) user.fullName = fullName;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Failed to update profile',
      error: error.message
    });
  }
};