import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolve the backend base URL.
 * Priority:
 *  1. `expo.extra.apiUrl` set in app.json (use this for a physical device on LAN,
 *     e.g. "http://192.168.1.20:5000").
 *  2. Android emulator -> host machine is reachable at 10.0.2.2.
 *  3. iOS simulator / web -> localhost.
 */
function resolveBaseUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim();
  if (fromExtra) return fromExtra.replace(/\/$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  return 'http://localhost:5000';
}

export const BASE_URL = resolveBaseUrl();

/** Build an absolute URL for a server-relative file path (mirrors web fileUrl()). */
export function fileUrl(path?: string): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_URL}${path}`;
}
