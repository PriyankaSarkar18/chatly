import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, username: user.username }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

export const verifyToken = (token) => jwt.verify(token, env.jwt.secret);
