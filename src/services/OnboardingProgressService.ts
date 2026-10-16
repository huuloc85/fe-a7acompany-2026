import axiosPrivate from '@/api/axiosInstance';

export type OnboardingTaskKey =
  | 'profile_reviewed'
  | 'avatar_updated'
  | 'avatar_skipped';
export interface OnboardingProgress {
  guide_id: string;
  version: number;
  revision: number;
  status: 'not_started' | 'in_progress' | 'deferred' | 'completed';
  last_step_id: string | null;
  completed_step_ids: string[];
  task_results: Partial<Record<OnboardingTaskKey, string>>;
}
export type OnboardingProgressPatch = Partial<
  Pick<
    OnboardingProgress,
    'status' | 'last_step_id' | 'completed_step_ids' | 'task_results'
  >
>;

export const createEmptyProgress = (guide: string): OnboardingProgress => ({
  guide_id: guide,
  version: 1,
  revision: 0,
  status: 'not_started',
  last_step_id: null,
  completed_step_ids: [],
  task_results: {}
});

export async function fetchOnboardingProgress(guide: string) {
  const response = await axiosPrivate.get<
    never,
    { data: OnboardingProgress | null }
  >(`/api/onboarding/progress/${guide}`, { params: { version: 1 } });
  return response.data ?? createEmptyProgress(guide);
}

export async function saveOnboardingProgress(
  current: OnboardingProgress,
  patch: OnboardingProgressPatch
) {
  const response = await axiosPrivate.put<never, { data: OnboardingProgress }>(
    `/api/onboarding/progress/${current.guide_id}`,
    { ...patch, version: current.version, revision: current.revision }
  );
  return response.data;
}
