export type RateSample = {
  time: number;
  ok: number;
  ng: number;
  session: string;
};

export type RateReading = { sample: RateSample; value: number };
export type RateTracker = { samples: RateSample[]; last: RateReading | null };

export function compatibleRateSample(previous: RateSample, next: RateSample) {
  return (
    previous.session === next.session &&
    next.time >= previous.time &&
    next.ok >= previous.ok &&
    next.ng >= previous.ng
  );
}

export function updateRateTracker(
  tracker: RateTracker,
  next: RateSample,
  running: boolean
): RateTracker {
  const last =
    tracker.last && compatibleRateSample(tracker.last.sample, next)
      ? tracker.last
      : null;
  if (!running) return { samples: [], last };
  const samples = appendRateSample(tracker.samples, next);
  const value = productionRate(samples);
  return { samples, last: value === null ? last : { sample: next, value } };
}

// Only the last measured rate survives a remount; never join samples across reloads.
export function readRateReading(raw: string | null): RateReading | null {
  try {
    const reading = JSON.parse(raw ?? 'null') as RateReading | null;
    const sample = reading?.sample;
    return reading &&
      Number.isFinite(reading.value) &&
      reading.value >= 0 &&
      sample &&
      typeof sample.session === 'string' &&
      sample.session.length > 0 &&
      Number.isSafeInteger(sample.time) &&
      sample.time > 0 &&
      Number.isSafeInteger(sample.ok) &&
      sample.ok >= 0 &&
      Number.isSafeInteger(sample.ng) &&
      sample.ng >= 0
      ? reading
      : null;
  } catch {
    return null;
  }
}

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
