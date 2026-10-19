import type { PayrollProfile } from './payrollCalculation';

// Legacy API snapshots may contain only identity fields. Never replace an
// explicit zero or cleared string with a newer catalogue value.
export function resolveSnapshotProfile(
  snapshot: PayrollProfile,
  catalogue?: PayrollProfile
): PayrollProfile {
  const present = Object.fromEntries(
    Object.entries(snapshot).filter(([, value]) => value != null)
  );
  return { ...catalogue, ...present } as PayrollProfile;
}
