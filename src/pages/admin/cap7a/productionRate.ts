export type RateSample = {
  time: number;
  ok: number;
  ng: number;
  session: string;
};

export function appendRateSample(
  samples: RateSample[],
  next: RateSample
): RateSample[] {
  const last = samples[samples.length - 1];
  if (!last) return [next];
  if (
    next.session !== last.session ||
    next.ok < last.ok ||
    next.ng < last.ng ||
    next.time < last.time ||
    next.time - last.time > 20000
  )
    return [next];
  if (next.time === last.time) return samples;
  return [...samples.filter((s) => next.time - s.time <= 60000), next];
}

export function productionRate(samples: RateSample[]): number | null {
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const seconds = (last.time - first.time) / 1000;
  return seconds >= 10
    ? (last.ok + last.ng - first.ok - first.ng) / seconds
    : null;
}
