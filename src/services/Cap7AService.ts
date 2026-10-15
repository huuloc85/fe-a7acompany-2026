import axiosPrivate from '@/api/axiosInstance';

export type Cap7AAction =
  | 'ping'
  | 'run'
  | 'stop'
  | 'test'
  | 'reset_counters'
  | 'set_threshold'
  | 'set_roi'
  | 'clear_roi';
export interface Cap7AState {
  session_id: string;
  mode: string;
  remote_allowed: boolean;
  camera_ready: boolean;
  model_ready: boolean;
  worker_alive?: boolean;
  plc_ok: boolean;
  total: number;
  ok: number;
  ng: number;
  result: string;
  result_mode: string | null;
  result_at_ms: number | null;
  cpu_temp_c: number | null;
  gpu_temp_c: number | null;
  threshold: number;
  roi: number[] | null;
  model: string;
}
export interface Cap7AStatus {
  configured: boolean;
  online: boolean;
  state: Cap7AState | null;
  received_at_ms: number | null;
  commands_enabled: boolean;
}

export const getCap7AStatus = () =>
  axiosPrivate.get<unknown, Cap7AStatus>('/api/cap7a/status', {
    timeout: 12000
  });

export interface Cap7ADaily {
  available: boolean;
  date: string;
  received_at_ms?: number;
  reset_at_ms?: number;
  reset_pending?: boolean;
  report: {
    total: number;
    ok: number;
    ng: number;
    unconfirmed: number;
    ok_percent: number | null;
    warning: boolean;
    hours: { hour: number; ok: number; ng: number; unconfirmed: number }[];
  } | null;
}

export const getCap7ADaily = (date: string) =>
  axiosPrivate.get<unknown, Cap7ADaily>('/api/cap7a/daily', {
    params: { date },
    timeout: 12000
  });

export const resetCap7ADaily = (date: string) =>
  axiosPrivate.post<unknown, Cap7ADaily>(
    '/api/cap7a/daily/reset',
    { date },
    { timeout: 15000 }
  );

export const sendCap7ACommand = (
  session: string,
  action: Cap7AAction,
  values = {}
) =>
  axiosPrivate.post<unknown, { ok: boolean; message: string; status?: string }>(
    '/api/cap7a/commands',
    {
      request_id: crypto.randomUUID(),
      session_id: session,
      action,
      values,
      confirmed: true
    },
    { timeout: 30000 }
  );
