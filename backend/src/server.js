import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool, testDatabaseConnection } from './config/db.js';
import { initSockets } from './sockets/index.js';

const start = async () => {
  const database = await testDatabaseConnection();
  console.log(`✓ MySQL ${database.version || ''} connected: ${env.db.database} @ ${database.host}:${database.port}`);

  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);

  server.listen(env.port, () => {
    console.log(`✓ API ready on http://localhost:${env.port}`);
    console.log(`✓ Socket.IO ready on ws://localhost:${env.port}`);
    console.log(`✓ Allowing client at ${env.clientUrl}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down…`);
    server.close(async () => {
      await closePool().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((error) => {
  console.error('✗ Failed to start server:', error.message);
  console.error('  Check that MySQL is running on port 3306 and backend/.env is correct.');
  process.exit(1);
});
