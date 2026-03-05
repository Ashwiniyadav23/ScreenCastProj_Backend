import express from 'express';
import { param } from 'express-validator';
import User from '../models/User.js';
import Recording from '../models/Recording.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user profile (public info only)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('fullName avatarUrl createdAt');
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Get public recordings count
    const publicRecordingsCount = await Recording.countDocuments({
      userId: id,
      isPublic: true
    });

    res.json({
      user: {
        ...user.toJSON(),
        publicRecordingsCount
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Get user's public recordings
router.get('/:id/recordings', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(id).select('fullName avatarUrl');
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const recordings = await Recording.find({
      userId: id,
      isPublic: true
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'fullName avatarUrl');

    const total = await Recording.countDocuments({
      userId: id,
      isPublic: true
    });

    // Add full URL to each recording
    const recordingsWithUrls = recordings.map(recording => ({
      ...recording.toJSON(),
      url: `/uploads/${id}/${recording.fileName}`
    }));

    res.json({
      user,
      recordings: recordingsWithUrls,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecordings: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user recordings error:', error);
    res.status(500).json({
      message: 'Failed to fetch user recordings',
      error: error.message
    });
  }
});

export default router;