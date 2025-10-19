// src/api/totals.ts
import { apiFetch } from './client';

export type TotalsRow = {
  code: string;
  name: string;
  category: string;
  time_minutes_total: number | string; // n8n may return strings
  money_total_eur: number | string;
};

export async function getTotals(childId: string) {
  return apiFetch<TotalsRow[]>(
    `/api/totals?child_id=${encodeURIComponent(childId)}`,
    { method: 'GET' },
  );
}
