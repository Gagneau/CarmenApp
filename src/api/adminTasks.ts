import { apiFetch } from './client';

export type TaskRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  time_reward: 'NONE' | 'MIN_15' | 'HOUR_1' | 'NEG_MIN_15' | 'NEG_HOUR_1';
  money_reward_eur: string; // comes as string from backend
  active: boolean;
  effective_from: string | null;
};

export async function listTasks(params?: {
  search?: string;
  category?: string;
  active?: 'true' | 'false';
  sort?: 'name_asc' | 'name_desc' | 'money_desc';
  page?: number;
  page_size?: number;
}) {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
  }
  const url = `/api/admin/tasks${qs.toString() ? `?${qs.toString()}` : ''}`;
  return apiFetch<TaskRow[]>(url, { method: 'GET' });
}

// Update an existing task
export async function updateTask(payload: {
  id: string;
  active?: boolean;
  name?: string;
  time_reward?: 'NONE' | 'MIN_15' | 'HOUR_1' | 'NEG_MIN_15' | 'NEG_HOUR_1';
  money_reward_eur?: number;
}) {
  return apiFetch<TaskRow>('/api/admin/tasks/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Create a new task
export async function createTask(payload: {
  code: string;
  name: string;
  category: string;
  time_reward: 'NONE' | 'MIN_15' | 'HOUR_1' | 'NEG_MIN_15' | 'NEG_HOUR_1';
  money_reward_eur: number;
  active?: boolean;
  effective_from?: string | null;
}) {
  return apiFetch<TaskRow>('/api/admin/tasks/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
