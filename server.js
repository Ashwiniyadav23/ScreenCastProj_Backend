import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { resolveUploadDir } from './lib/uploads.js';

import authRoutes from './routes/auth.js';
import recordingRoutes from './routes/recordings.js';
import userRoutes from './routes/users.js';

// Configuration
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const uploadDir = resolveUploadDir({
  isProduction,
  projectRootDir: __dirname
});

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:8080'
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }

  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    const corsError = new Error(`Not allowed by CORS: ${origin}`);
    corsError.status = 403;
    return callback(corsError);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(limiter);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (recordings) with proper headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
}, express.static(uploadDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ScreenCast API is running' });
});

// Root endpoint for deployment sanity checks
app.get('/', (req, res) => {
  res.json({
    message: 'ScreenCast backend is running',
    health: '/api/health'
  });
});

// Test endpoint to check file serving
app.get('/api/test-upload/:userId/:filename', (req, res) => {
  const { userId, filename } = req.params;
  const filePath = path.join(uploadDir, userId, filename);
  
  if (fs.existsSync(filePath)) {
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}/uploads/${userId}/${filename}`;
    
    res.json({ 
      exists: true, 
      path: filePath, 
      url: fullUrl,
      size: fs.statSync(filePath).size
    });
  } else {
    res.status(404).json({ 
      exists: false, 
      path: filePath,
      message: 'File not found' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || (err.name === 'MulterError' ? 400 : 500);
  if (statusCode >= 500) {
    console.error(err.stack || err.message);
  } else {
    console.warn(err.message);
  }

  const isClientError = statusCode >= 400 && statusCode < 500;

  let message = 'Something went wrong!';
  if (statusCode === 403) {
    message = 'CORS origin is not allowed';
  } else if (isClientError) {
    message = err.message || 'Bad request';
  }

  res.status(statusCode).json({ 
    message,
    error: process.env.NODE_ENV === 'development' ? err.message : {} 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// MongoDB connection
let isConnected = false;
let connectionPromise = null;

export const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  if (connectionPromise) {
    return connectionPromise;
  }
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });

    await connectionPromise;
    
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    connectionPromise = null;
    isConnected = false;
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Initialize DB connection
connectDB().catch((error) => {
  console.error('Initial DB connection failed:', error.message);
});

// Start server in local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// For Vercel deployment - don't start server
export default app;