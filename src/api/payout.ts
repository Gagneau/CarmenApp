// src/api/payout.ts
import { apiFetch } from './client';

export type PreviewLine = {
  code: string;
  name: string;
  category: string;
  chosen_time: number | string;
  chosen_money: number | string;
};

export type PreviewResponse = {
  lines: PreviewLine[] | null;
  total_time_minutes: number | string;
  total_money_eur: number | string;
};

// The n8n respond node can send an object or an array with a single object.
// This normalizer makes the UI tolerant to both.
function normalizePreview(raw: any): PreviewResponse {
  const data = Array.isArray(raw) ? raw[0] : raw;
  const lines = (data?.lines ?? null) as PreviewLine[] | null;
  return {
    lines,
    total_time_minutes: data?.total_time_minutes ?? 0,
    total_money_eur: data?.total_money_eur ?? 0,
  };
}

export async function getPayoutPreview(childId: string) {
  const raw = await apiFetch<PreviewResponse | PreviewResponse[]>(
    `/api/payout/preview?child_id=${encodeURIComponent(childId)}`,
    { method: 'GET' }
  );
  return normalizePreview(raw);
}

export type ConfirmResponse = {
  payout_id: string | null;
  total_time_minutes: number | string;
  total_money_eur: number | string;
  lines_inserted?: number | string;
  items_marked_paid?: number | string;
  did_payout?: 0 | 1;
};

export async function confirmPayout(payload: {
  child_id: string;
  approved_by_admin_id: string;
}) {
  return apiFetch<ConfirmResponse>('/api/payout/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
