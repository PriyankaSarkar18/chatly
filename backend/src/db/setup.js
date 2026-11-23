import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates the database (if needed) and runs schema.sql against it.
 * Safe to run more than once - every statement uses CREATE TABLE IF NOT EXISTS.
 */
const setup = async () => {
  const { database, ...connectionOptions } = env.db;

  console.log(`→ Connecting to MySQL ${connectionOptions.host}:${connectionOptions.port} as ${connectionOptions.user}`);

  const admin = await mysql.createConnection({ ...connectionOptions, multipleStatements: true });
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await admin.query(`USE \`${database}\``);

  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await admin.query(schema);
  await admin.end();

  console.log(`✓ Database "${database}" is ready (schema applied)`);
};

setup().catch((error) => {
  console.error('✗ Database setup failed:', error.message);
  console.error('  Check that MySQL/Laragon is running on port', env.db.port, 'and that the credentials in backend/.env are correct.');
  process.exit(1);
});
