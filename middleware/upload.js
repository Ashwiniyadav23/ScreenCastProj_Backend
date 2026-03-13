import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const configuredUploadDir = process.env.UPLOAD_DIR;

const uploadDir = (() => {
  if (isProduction) {
    if (configuredUploadDir && path.isAbsolute(configuredUploadDir)) {
      return configuredUploadDir;
    }

    return '/tmp/uploads';
  }

  if (configuredUploadDir) {
    return path.resolve(configuredUploadDir);
  }

  return path.join(path.dirname(__dirname), 'uploads');
})();

const ensureDir = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`Failed to create upload directory: ${dirPath}`, error.message);
    return false;
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const userDir = path.join(uploadDir, req.user._id.toString());
      const baseDirReady = ensureDir(uploadDir);
      const userDirReady = baseDirReady && ensureDir(userDir);

      if (!userDirReady) {
        return cb(new Error('Upload storage is not available'));
      }

      cb(null, userDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `recording_${timestamp}${extension}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept only video files
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

export default upload;