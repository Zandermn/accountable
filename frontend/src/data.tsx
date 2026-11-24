import { createContext, useContext, useEffect, useState } from 'react';
export const stages = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
export const probabilities = [10, 25, 50, 75, 100, 0];
export const labels: Record<string, string> = {
  name: 'Name',
  website: 'Website',
  industry: 'Industry',
  contacts_count: 'Contacts',
  deals_count: 'Deals',
  notes: 'Notes',
  status: 'Status',
  email: 'Email',
  phone: 'Phone',
  job_title: 'Job title',
  organization_id: 'Organization',
  contact_id: 'Main contact',
  stage: 'Stage',
  value_cents: 'Value (USD)',
  probability: 'Probability (%)',
  expected_date: 'Expected close date',
  actual_date: 'Actual close date',
  description: 'Description',
  type: 'Activity type',
  occurred_at: 'Occurred at',
  follow_up: 'Follow-up date',
  organization: 'Organization',
  contact: 'Main contact',
  close_date: 'Close date',
};
export const fields: Record<string, string[]> = {
  organizations: ['name', 'website', 'industry', 'notes'],
  contacts: ['name', 'status', 'email', 'phone', 'job_title', 'organization_id'],
  deals: [
    'name',
    'stage',
    'value_cents',
    'probability',
    'expected_date',
    'actual_date',
    'organization_id',
    'contact_id',
  ],
  activities: ['type', 'description', 'occurred_at', 'follow_up'],
};
export const singular: Record<string, string> = {
  organizations: 'organization',
  contacts: 'contact',
  deals: 'deal',
  activities: 'activity',
};
export const heading = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
export function ShortDate({ value }: { value: string }) {
  if (!value) return <>—</>;
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value);
  return (
    <time dateTime={value} title={date.toLocaleDateString()}>
      {monthDay.format(date)}
    </time>
  );
}
export const money = (cents: number) =>
  'US$' +
  (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export type LinkRow = { id: string; name: string; kind: string; active?: boolean };
export interface Row {
  id: string;
  name: string;
  website: string;
  notes: string;
  status: string;
  job_title: string;
  industry: string;
  stage: string;
  value_cents: number;
  probability: number;
  expected_date: string;
  actual_date: string;
  close_date: string;
  late: boolean;
  organization_id: string;
  contact_id: string;
  deal_id: string;
  organization: string;
  contact: string;
  email: string;
  phone: string;
  type: string;
  description: string;
  occurred_at: string;
  follow_up: string;
  done: boolean;
  kind: string;
  deleted_at: string;
  deletion: string;
  related: LinkRow[];
  timeline: Row[];
  former: Record<string, LinkRow>;
  note_count: number;
}
export type Impact = {
  name: string;
  revision: number;
  blockers: Row[];
  clear: Row[];
  cascade: Row[];
};
export class Failure extends Error {
  constructor(
    message: string,
    public field?: string,
    public preview?: Impact,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  dataset?: number,
): Promise<T> {
  const form = body instanceof FormData;
  const res = await fetch('/api' + path, {
    method,
    headers: {
      ...(!form && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(dataset !== undefined ? { 'X-Dataset': String(dataset) } : {}),
    },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const location = data.sheet ? data.sheet + ', row ' + data.row + ', ' + data.field + ' — ' : '';
    throw new Failure(
      location + (data.message || 'The request failed. Refresh and try again.'),
      data.field,
      data.preview,
    );
  }
  return data;
}
export const Session = createContext({ dataset: 0, epoch: 0, refresh: () => {} });
export function useRead<T>(path: string | null) {
  const { epoch } = useContext(Session);
  const [result, set] = useState<{ path: string; value?: T; error?: string; epoch: number }>();
  useEffect(() => {
    let active = true;
    if (path)
      api<T>(path).then(
        (value) => {
          if (active) set({ path, value, epoch });
        },
        (error) => {
          if (active) set({ path, error: error.message, epoch });
        },
      );
    return () => {
      active = false;
    };
  }, [path, epoch]);
  return result?.path === path ? result : undefined;
}
export function ReadState({ error, empty }: { error?: string; empty?: string }) {
  return (
    <p className="notice" role={error ? 'alert' : 'status'}>
      {error || empty || 'Loading…'}
    </p>
  );
}
// A workbook can supply text IDs that contain a slash or a reserved path segment.
export function idSegment(id: string) {
  const reserved = id.includes('/') || id === '.' || id === '..' || id.startsWith('~');
  return encodeURIComponent(reserved ? '~' + encodeURIComponent(id) : id);
}
export function segmentId(segment: string) {
  const id = decodeURIComponent(segment);
  return id.startsWith('~') ? decodeURIComponent(id.slice(1)) : id;
}
export const recordPath = (kind: string, id?: string) =>
  '/records/' + kind + (id ? '/' + idSegment(id) : '');
export const detailPath = (kind: string, id: string) => '/' + kind + '/' + idSegment(id);
export function localTime(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
