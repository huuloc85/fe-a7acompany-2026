import axiosPrivate from '@/api/axiosInstance';

export type Cap7ASystem = 'tail' | 'spike';
export type SpikeAction =
  | 'calibrate'
  | 'back'
  | 'page'
  | 'select'
  | 'adjust'
  | 'threshold_view'
  | 'reset_params'
  | 'reset_counters'
  | 'move_roi'
  | 'save_roi'
  | 'reset_roi';
export interface SpikeControlsState {
  core_session: string;
  revision: number;
  calibration: number;
  page: 'vision' | 'roi';
  selected: number;
  min_area: number;
  min_spike: number;
  show_threshold: number;
}
export interface Cap7ACapabilities {
  commands: boolean;
  daily: boolean;
  screen: boolean;
  threshold_unit: 'percent' | 'grayscale';
}

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
  controls?: SpikeControlsState;
  app_started_at_ms?: number | null;
  app_exited_at_ms?: number | null;
  runtime_date?: string;
  run_seconds?: number;
  stop_seconds?: number;
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
  system: Cap7ASystem;
  capabilities: Cap7ACapabilities;
  configured: boolean;
  online: boolean;
  state: Cap7AState | null;
  received_at_ms: number | null;
  commands_enabled: boolean;
}

export const getCap7AStatus = (system: Cap7ASystem, signal?: AbortSignal) =>
  axiosPrivate.get<unknown, Cap7AStatus>(`/api/cap7a/${system}/status`, {
    signal,
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
    partial?: boolean;
    coverage_start_ms?: number | null;
    hours: { hour: number; ok: number; ng: number; unconfirmed: number }[];
  } | null;
}

export const getCap7ADaily = (system: Cap7ASystem, date: string) =>
  axiosPrivate.get<unknown, Cap7ADaily>(`/api/cap7a/${system}/daily`, {
    params: { date },
    timeout: 12000
  });

export const resetCap7ADaily = (system: Cap7ASystem, date: string) =>
  axiosPrivate.post<unknown, Cap7ADaily>(
    `/api/cap7a/${system}/daily/reset`,
    { date },
    { timeout: 15000 }
  );

export const sendSpikeCommand = (
  state: Cap7AState,
  action: SpikeAction,
  values: Record<string, unknown> = {}
) =>
  axiosPrivate.post<
    unknown,
    { ok: boolean; message: string; revision?: number }
  >(
    '/api/cap7a/spike/commands',
    {
      request_id: crypto.randomUUID(),
      session_id: state.session_id,
      action,
      values,
      revision: state.controls?.revision,
      confirmed: true
    },
    { timeout: 15000 }
  );

export const sendCap7ACommand = (
  system: Cap7ASystem,
  session: string,
  action: Cap7AAction,
  values = {}
) =>
  axiosPrivate.post<unknown, { ok: boolean; message: string; status?: string }>(
    `/api/cap7a/${system}/commands`,
    {
      request_id: crypto.randomUUID(),
      session_id: session,
      action,
      values,
      confirmed: true
    },
    { timeout: 30000 }
  );
