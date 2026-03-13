import { validationResult } from 'express-validator';
import Recording from '../models/Recording.js';
import fs from 'fs';
import path from 'path';

export const uploadRecording = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded'
      });
    }

    const { title, description, duration, tags } = req.body;
    
    // Parse tags if provided as string
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    // Create recording record
    const recording = new Recording({
      userId: req.user._id,
      title: title || 'Untitled Recording',
      description: description || '',
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      duration: duration ? parseInt(duration) : 0,
      mimeType: req.file.mimetype,
      tags: parsedTags
    });

    await recording.save();

    // Generate full URL for accessing the file
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}/uploads/${req.user._id}/${req.file.filename}`;

    res.status(201).json({
      message: 'Recording uploaded successfully',
      recording: recording,
      url: fullUrl,
      public_url: fullUrl
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    console.error('Upload recording error:', error);
    res.status(500).json({
      message: 'Failed to upload recording',
      error: error.message
    });
  }
};

export const getUserRecordings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const recordings = await Recording.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'fullName email');

    const total = await Recording.countDocuments({ userId: req.user._id });

    // Add full URL to each recording
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    
    const recordingsWithUrls = recordings.map(recording => ({
      ...recording.toJSON(),
      id: recording._id,
      url: `${protocol}://${host}/uploads/${req.user._id}/${recording.fileName}`,
      public_url: `${protocol}://${host}/uploads/${req.user._id}/${recording.fileName}`,
      created_at: recording.createdAt,
      file_size: recording.fileSize
    }));

    res.json({
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
    console.error('Get recordings error:', error);
    res.status(500).json({
      message: 'Failed to fetch recordings',
      error: error.message
    });
  }
};

export const getRecording = async (req, res) => {
  try {
    const { id } = req.params;
    
    const recording = await Recording.findById(id)
      .populate('userId', 'fullName email avatarUrl');

    if (!recording) {
      return res.status(404).json({
        message: 'Recording not found'
      });
    }

    // Check if user has access to this recording
    if (recording.userId._id.toString() !== req.user._id.toString() && !recording.isPublic) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Increment view count if not the owner
    if (recording.userId._id.toString() !== req.user._id.toString()) {
      recording.views += 1;
      await recording.save();
    }

    const recordingWithUrl = {
      ...recording.toJSON(),
      url: `/uploads/${recording.userId._id}/${recording.fileName}`
    };

    res.json({
      recording: recordingWithUrl
    });
  } catch (error) {
    console.error('Get recording error:', error);
    res.status(500).json({
      message: 'Failed to fetch recording',
      error: error.message
    });
  }
};

export const updateRecording = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isPublic, tags } = req.body;

    const recording = await Recording.findById(id);
    
    if (!recording) {
      return res.status(404).json({
        message: 'Recording not found'
      });
    }

    // Check if user owns this recording
    if (recording.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Update fields
    if (title !== undefined) recording.title = title;
    if (description !== undefined) recording.description = description;
    if (isPublic !== undefined) recording.isPublic = isPublic;
    if (tags !== undefined) recording.tags = tags;

    await recording.save();

    const recordingWithUrl = {
      ...recording.toJSON(),
      url: `/uploads/${req.user._id}/${recording.fileName}`
    };

    res.json({
      message: 'Recording updated successfully',
      recording: recordingWithUrl
    });
  } catch (error) {
    console.error('Update recording error:', error);
    res.status(500).json({
      message: 'Failed to update recording',
      error: error.message
    });
  }
};

export const deleteRecording = async (req, res) => {
  try {
    const { id } = req.params;
    
    const recording = await Recording.findById(id);
    
    if (!recording) {
      return res.status(404).json({
        message: 'Recording not found'
      });
    }

    // Check if user owns this recording
    if (recording.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(recording.filePath)) {
      fs.unlink(recording.filePath, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    // Delete from database
    await Recording.findByIdAndDelete(id);

    res.json({
      message: 'Recording deleted successfully'
    });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({
      message: 'Failed to delete recording',
      error: error.message
    });
  }
};

export const getPublicRecordings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const recordings = await Recording.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'fullName avatarUrl');

    const total = await Recording.countDocuments({ isPublic: true });

    // Add full URL to each recording
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    
    const recordingsWithUrls = recordings.map(recording => ({
      ...recording.toJSON(),
      id: recording._id,
      url: `${protocol}://${host}/uploads/${req.user._id}/${recording.fileName}`,
      public_url: `${protocol}://${host}/uploads/${req.user._id}/${recording.fileName}`,
      created_at: recording.createdAt,
      file_size: recording.fileSize
    }));

    res.json({
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
    console.error('Get public recordings error:', error);
    res.status(500).json({
      message: 'Failed to fetch public recordings',
      error: error.message
    });
  }
};