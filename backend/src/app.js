import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

import authRoutes from './modules/auth/auth.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import statusRoutes from './modules/status/status.routes.js';
import callRoutes from './modules/call/call.routes.js';
import vcallRoutes from './modules/vcall/vcall.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === env.clientUrl) return callback(null, true);
        // Allow any localhost port so Vite/Preview servers can talk to the API.
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(env.uploads.publicPath, express.static(env.uploads.dir, { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Chat API is running', data: { uptime: process.uptime() } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/status', statusRoutes);
  app.use('/api/call', callRoutes);
  app.use('/api/vcall', vcallRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
