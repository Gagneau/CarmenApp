import { apiFetch } from './client';

export type ChildRow = { id: string; display_name: string; status: string };
export type LinksRow = { adult_id: string; adult_display_name?: string; child_ids: string[] };

export async function listChildren() {
  return apiFetch<ChildRow[]>('/api/admin/children', { method: 'GET' });
}

export async function getLinks(adultId: string) {
  return apiFetch<LinksRow>(`/api/admin/links?adult_id=${encodeURIComponent(adultId)}`, { method: 'GET' });
}

// Part 2 (next step) will use this:
export async function setLinks(adultId: string, childIds: string[]) {
  return apiFetch<LinksRow>('/api/admin/links/set', {
    method: 'POST',
    body: JSON.stringify({ adult_id: adultId, child_ids: childIds }),
  });
}
