// src/api/tasks.ts
import { apiFetch } from './client';

export type TimeReward = 'NONE' | 'MIN_15' | 'HOUR_1' | 'NEG_MIN_15' | 'NEG_HOUR_1';

export type Task = {
  code: string;
  name: string;
  category: string;
  time_reward: TimeReward;
  money_reward_eur: string | number; // n8n can return string or number
};

export async function getTasks() {
  return apiFetch<Task[]>('/api/tasks', { method: 'GET' });
}
