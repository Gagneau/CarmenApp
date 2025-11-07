// src/api/adminUsers.ts
import { apiFetch } from './client';

export type AdminUser = {
  id: string;
  display_name: string;
  role: 'admin' | 'adult' | 'child';
  status: string;
};

export async function listUsers() {
  // cache-bust to avoid 304 with old bodies
  const t = Date.now();
  return apiFetch<AdminUser[]>(
    `/api/admin/users?t=${t}`,
    { method: 'GET', cache: 'no-store' } as any
  );
}

export async function createUser(payload: {
  display_name: string;
  role: 'admin' | 'adult' | 'child';
  password: string;
}) {
  const res = await apiFetch<any>('/api/admin/users/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res || typeof res !== 'object' || !('id' in res)) {
    const msg = res && res.error ? String(res.error) : 'create_failed';
    throw new Error(msg);
  }
  return res as AdminUser;
}

export async function updateUser(payload: {
  user_id: string;
  display_name?: string;
  role?: 'admin' | 'adult' | 'child';
  status?: 'active' | 'disabled';
  password?: string; // reset
}) {
  const res = await apiFetch<any>('/api/admin/users/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res || typeof res !== 'object' || !('id' in res)) {
    const msg = res && res.error ? String(res.error) : 'update_failed';
    throw new Error(msg);
  }
  return res as AdminUser;
}

export async function deleteUser(payload: { user_id: string }) {
  const res = await apiFetch<any>('/api/admin/users/delete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res || res.error) {
    throw new Error(res?.error || 'delete_failed');
  }
  return res as { user_id: string; deleted: boolean };
}
