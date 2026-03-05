import express from 'express';
import { body, param } from 'express-validator';
import { 
  uploadRecording,
  getUserRecordings,
  getRecording,
  updateRecording,
  deleteRecording,
  getPublicRecordings
} from '../controllers/recordingController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Validation middleware
const uploadValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .trim()
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .trim()
    .withMessage('Description cannot exceed 1000 characters'),
  body('duration')
    .optional()
    .isNumeric()
    .withMessage('Duration must be a number'),
  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch (e) {
          return false;
        }
      }
      return Array.isArray(value);
    })
    .withMessage('Tags must be an array')
];

const updateValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid recording ID'),
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .trim()
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .trim()
    .withMessage('Description cannot exceed 1000 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid recording ID')
];

// Public routes
router.get('/public', getPublicRecordings);

// Protected routes
router.post('/upload', authenticateToken, upload.single('recording'), uploadValidation, uploadRecording);
router.get('/my-recordings', authenticateToken, getUserRecordings);
router.get('/:id', authenticateToken, idValidation, getRecording);
router.patch('/:id', authenticateToken, updateValidation, updateRecording);
router.delete('/:id', authenticateToken, idValidation, deleteRecording);

export default router;