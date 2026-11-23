import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large (max 15 MB)'
        : `Upload failed: ${error.message}`;
    return res.status(400).json({ success: false, message });
  }

  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'That value is already taken' });
  }

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  console.error('✗ Unhandled error:', error);
  return res.status(500).json({ success: false, message: 'Something went wrong on the server' });
};
