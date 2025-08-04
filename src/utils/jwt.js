import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRATION = '1d'; // 1 day

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRATION });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

