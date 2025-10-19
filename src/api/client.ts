import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://kyrillkazak.app.n8n.cloud/webhook'; // production endpoints

// ---------- Safe storage (works on web & native) ----------
const isWeb = Platform.OS === 'web';
const hasSecure =
  SecureStore && typeof (SecureStore as any).getItemAsync === 'function';

export async function readItem(key: string) {
  if (isWeb || !hasSecure) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

export async function writeItem(key: string, value: string) {
  if (isWeb || !hasSecure) {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string) {
  if (isWeb || !hasSecure) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// ---------- Token helpers (use safe storage) ----------
let inMemoryToken: string | null = null;

export async function getToken() {
  if (inMemoryToken) return inMemoryToken;
  const t = await readItem('token');
  inMemoryToken = t;
  return t;
}

export async function setToken(token: string) {
  inMemoryToken = token;
  await writeItem('token', token);
}

export async function clearToken() {
  inMemoryToken = null;
  await deleteItem('token');
}

// ---------- Fetch with optional auth ----------
export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {},
  requireAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };

  if (requireAuth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  if (res.status === 401) throw new Error('unauthorized');
  if (res.status === 403) throw new Error('forbidden');

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
