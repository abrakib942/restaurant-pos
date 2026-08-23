import type { IncomingHttpHeaders } from 'node:http';

export function getClientIp(headers: IncomingHttpHeaders): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? '';
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() ?? '';
  }
  const realIp = headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }
  return '';
}
