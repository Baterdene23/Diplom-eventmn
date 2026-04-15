import crypto from 'crypto';
import { NextRequest } from 'next/server';

const MAX_SKEW_MS = 5 * 60 * 1000;

export function requireGatewaySignature(request: NextRequest, targetPath: string): void {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error('INTERNAL_API_SECRET is not set');
  }

  const tsHeader = request.headers.get('x-internal-ts');
  const sigHeader = request.headers.get('x-internal-signature');
  if (!tsHeader || !sigHeader) {
    const err: any = new Error('Missing internal signature');
    err.status = 401;
    throw err;
  }

  const ts = Number(tsHeader);
  if (!Number.isFinite(ts)) {
    const err: any = new Error('Invalid internal timestamp');
    err.status = 401;
    throw err;
  }

  const skew = Math.abs(Date.now() - ts);
  if (skew > MAX_SKEW_MS) {
    const err: any = new Error('Internal signature expired');
    err.status = 401;
    throw err;
  }

  const method = request.method;
  const userId = request.headers.get('x-user-id') || '';
  const userRole = request.headers.get('x-user-role') || '';

  const base = `${tsHeader}.${method}.${targetPath}.${userId}.${userRole}`;
  const expected = crypto.createHmac('sha256', secret).update(base).digest('hex');

  // timingSafeEqual throws if buffer lengths differ
  if (sigHeader.length !== expected.length) {
    const err: any = new Error('Invalid internal signature');
    err.status = 401;
    throw err;
  }

  const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader));
  if (!ok) {
    const err: any = new Error('Invalid internal signature');
    err.status = 401;
    throw err;
  }
}
