import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';

fs.mkdirSync(env.uploads.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploads.dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : '';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});

const ALLOWED = /^(image\/(jpe?g|png|gif|webp|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|wav|webm|ogg)|application\/(pdf|zip|msword|vnd.*)|text\/plain)$/i;

export const upload = multer({
  storage,
  limits: { fileSize: env.uploads.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.test(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'This file type is not supported'));
  },
});

/** Builds the public URL path stored in the database. */
export const fileUrl = (file) => (file ? `${env.uploads.publicPath}/${file.filename}` : null);
