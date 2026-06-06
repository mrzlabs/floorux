import type { Role } from '@/types/roles';

export const OPERATE_COOKIE = 'floorux_operate';

export interface OperateToken {
  actorId: string;
  actorRole: Extract<Role, 'super_super_admin' | 'super_admin'>;
  comercioId: string;
  returnPath: '/super-root/comercios' | '/super';
  exp: number;
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

export async function createOperateToken(data: OperateToken, secret: string) {
  const payload = toBase64Url(JSON.stringify(data));
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyOperateToken(token: string | undefined, secret: string) {
  if (!token) return null;
  const [payload, suppliedSignature] = token.split('.');
  if (!payload || !suppliedSignature) return null;
  const expectedSignature = await signature(payload, secret);
  if (expectedSignature !== suppliedSignature) return null;

  try {
    const data = JSON.parse(fromBase64Url(payload)) as OperateToken;
    if (data.exp <= Date.now()) return null;
    if (!['super_super_admin', 'super_admin'].includes(data.actorRole)) return null;
    return data;
  } catch {
    return null;
  }
}
