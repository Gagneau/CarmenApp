import { apiFetch } from './client';

export type AdminUser = {
  id: string;
  display_name: string;
  role: 'admin' | 'adult' | 'child';
  status: string;
};

export async function listUsers() {
  return apiFetch<AdminUser[]>('/api/admin/users', { method: 'GET' });
}

export async function createUser(payload: {
  display_name: string;
  role: 'admin' | 'adult' | 'child';
  password: string;
}) {
  return apiFetch<AdminUser>('/api/admin/users/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
