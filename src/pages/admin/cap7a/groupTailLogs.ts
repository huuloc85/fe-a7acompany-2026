import type { TailAppLog } from '@/services/Cap7AService';

export function groupTailLogs(logs: TailAppLog[]) {
  const groups: (TailAppLog & { repetitions: number; firstAt: number })[] = [];
  for (const row of [...logs].sort(
    (a, b) => b.at_ms - a.at_ms || Number(b.id) - Number(a.id)
  )) {
    const previous = groups[groups.length - 1];
    if (
      previous &&
      previous.session_id === row.session_id &&
      previous.code === row.code &&
      previous.level === row.level &&
      previous.message === row.message &&
      previous.details.sdk_code === row.details.sdk_code &&
      previous.details.count === row.details.count
    ) {
      previous.repetitions += 1;
      previous.firstAt = row.at_ms;
    } else {
      groups.push({ ...row, repetitions: 1, firstAt: row.at_ms });
    }
  }
  return groups;
}
