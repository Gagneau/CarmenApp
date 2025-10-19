// src/api/history.ts
import { apiFetch } from './client';

export type HistoryLine = {
  code: string;
  name: string;
  time_minutes: number | string;
  money_eur: number | string;
};

export type HistoryItem = {
  payout_id: string;
  approved_at: string;          // ISO timestamp
  total_time_minutes: number;   // normalized to number
  total_money_eur: number;      // normalized to number
  lines: HistoryLine[];
};

function toNum(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/history?child_id=<UUID>
 * Returns newest-first payout list. This normalizes numeric fields
 * so the UI can safely do math / formatting.
 */
export async function getHistory(childId: string): Promise<HistoryItem[]> {
  const raw = await apiFetch<any>(
    `/api/history?child_id=${encodeURIComponent(childId)}`,
    { method: 'GET' }
  );

  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((it: any) => ({
    payout_id: String(it.payout_id ?? ''),
    approved_at: String(it.approved_at ?? ''),
    total_time_minutes: toNum(it.total_time_minutes),
    total_money_eur: toNum(it.total_money_eur),
    lines: Array.isArray(it.lines)
      ? it.lines.map((l: any) => ({
          code: String(l.code ?? ''),
          name: String(l.name ?? ''),
          time_minutes: toNum(l.time_minutes),
          money_eur: toNum(l.money_eur),
        }))
      : [],
  }));
}
