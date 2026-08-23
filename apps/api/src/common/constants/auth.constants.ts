export const AUTH_COOKIE = 'brasa_token';
export const AUTH_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
export const LOGIN_IP_MAX_FAILURES = 30;

export function roleHomePath(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'WAITER':
      return '/waiter';
    case 'KITCHEN':
      return '/kitchen';
    default:
      return '/login';
  }
}
