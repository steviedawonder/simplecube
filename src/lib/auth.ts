import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import db from './db';

// 프로덕션에서는 기본 시크릿으로 절대 폴백하지 않는다 (공개 리포라 기본값으로 토큰 위조 가능).
// JWT_SECRET 이 없으면 로그인·토큰 검증을 모두 거부(fail closed)한다.
const jwtSecretStr = import.meta.env.JWT_SECRET || (import.meta.env.PROD ? '' : 'dev-secret-change-in-production-32ch');
if (!jwtSecretStr) {
  console.error('[SECURITY] JWT_SECRET 환경변수가 없어 관리자 인증을 비활성화합니다.');
}
const JWT_SECRET = jwtSecretStr ? new TextEncoder().encode(jwtSecretStr) : null;

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
  if (!JWT_SECRET) throw new Error('JWT_SECRET 미설정 — 관리자 인증을 사용할 수 없습니다.');
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_HOURS}h`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  if (!JWT_SECRET) return null;
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

// 서명 검증 + DB 재조회: 비활성화·삭제·권한 변경된 계정의 토큰은 즉시 무효
export async function getActiveUser(token: string | null): Promise<UserPayload | null> {
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  try {
    const result = await db.execute({
      sql: 'SELECT id, name, username, role, active FROM users WHERE id = ?',
      args: [payload.userId],
    });
    const user = result.rows[0] as any;
    if (!user || !user.active) return null;
    return { userId: Number(user.id), username: user.username, role: user.role, name: user.name };
  } catch {
    return null;
  }
}

export function getSessionCookie(token: string): string {
  const secure = import.meta.env.PROD ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${EXPIRY_HOURS * 3600}`;
}

export function clearSessionCookie(): string {
  const secure = import.meta.env.PROD ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
