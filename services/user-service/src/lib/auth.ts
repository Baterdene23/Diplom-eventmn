import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}
const JWT_EXPIRES_IN = '15m'; // Access token: 15 минут
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // Refresh token: 7 хоног

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Access token үүсгэх
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

// Refresh token үүсгэх
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

// Token шалгах
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

// Нууц үг hash хийх
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Нууц үг шалгах
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Authorization header-аас token авах
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
