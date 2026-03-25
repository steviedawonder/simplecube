import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import db from './db';

const JWT_SECRET = new TextEncoder().encode(
  import.meta.env.JWT_SECRET || 'dev-secret-change-in-production-32ch'
);

const COOKIE_NAME = 'sc_admin_session';
const EXPIRY_HOURS = 24;

export interface UserPayload {
  userId: number;
  username: string;
  role: 'owner' | 'editor';
  name: string;
}

export async function authenticateUser(username: string, password: string): Promise<UserPayload | null> {
  const result = await db.execute({
    sql: 'SELECT id, name, username, password_hash, role, active FROM users WHERE username = ?',
    args: [username],
  });

  if (result.rows.length === 0) return null;

  const user = result.rows[0] as any;
  if (!user.active) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  };
}

export async function createToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_HOURS}h`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      username: payload.username as string,
      role: payload.role as 'owner' | 'editor',
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function getSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${EXPIRY_HOURS * 3600}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
