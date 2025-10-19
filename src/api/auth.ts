import { apiFetch, setToken } from './client';

type LoginResponse = {
  user_id: string;
  role: 'admin' | 'adult' | 'child';
  display_name: string;
  token: string;
  expires_at: string;
};

export async function login(alias: string, password: string) {
  const data = await apiFetch<LoginResponse>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ alias, password }) },
    false // login does not require an existing token
  );
  if (!data || !('token' in data)) throw new Error('invalid_credentials');
  await setToken(data.token);
  return data;
}
