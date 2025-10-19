// src/api/preferences.ts
import { apiFetch } from './client';

export type Preference = 'TIME' | 'MONEY';

export async function setPreference(payload: {
  child_id: string;
  task_code: string;
  preference: Preference;
}) {
  return apiFetch('/api/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
