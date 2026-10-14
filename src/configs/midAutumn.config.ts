// Campaign dates use Vietnam time, independent of the device's timezone.
// Mid-Autumn follows the lunar calendar: configure each year's actual dates,
// never repeat September 25 automatically in subsequent years.
export const MID_AUTUMN_CAMPAIGN = {
  startsAt: '2026-09-11T00:00:00+07:00',
  endsAt: '2026-09-26T00:00:00+07:00'
} as const;

export function isMidAutumnActive(now = Date.now()): boolean {
  return (
    now >= Date.parse(MID_AUTUMN_CAMPAIGN.startsAt) &&
    now < Date.parse(MID_AUTUMN_CAMPAIGN.endsAt)
  );
}

export function getMidAutumnRefreshDelay(now = Date.now()): number {
  const nextBoundary = [
    Date.parse(MID_AUTUMN_CAMPAIGN.startsAt),
    Date.parse(MID_AUTUMN_CAMPAIGN.endsAt)
  ].find((boundary) => boundary > now);

  return Math.min(
    60_000,
    nextBoundary === undefined ? 60_000 : nextBoundary - now
  );
}
