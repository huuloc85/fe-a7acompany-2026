// Polling failures back off; successful reads restore the normal cadence.
// RPC mutations must never use this policy or be retried automatically.
export function livePollingInterval(baseMs: number, failedReads: number) {
  return failedReads > 0 ? 30000 : baseMs;
}
