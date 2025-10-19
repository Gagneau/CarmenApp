// src/api/submissions.ts
import { apiFetch } from './client';

export type SubmissionItem = { task_code: string; quantity: number };

export type SubmissionResponse = {
  submission_id: string | null;
  total_time_minutes: number | string;
  total_money_eur: number | string;
  // Optional diagnostics from our n8n query (may not always be present)
  user_error?: number;
  missing_task_count?: number;
};

export async function submitSubmission(payload: {
  adult_id: string;
  child_id: string;
  items: SubmissionItem[];
}) {
  return apiFetch<SubmissionResponse>('/api/submissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
