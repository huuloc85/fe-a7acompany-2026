export type LogFilter = 'ALL' | 'ERROR' | 'INFO';

/** Filter whole entries so continuation lines and stack traces stay attached. */
export function filterSystemLogs(
  logs: string,
  level: LogFilter,
  search = ''
): string[] {
  const entries: { level: string; lines: string[] }[] = [];
  for (const line of logs.split('\n')) {
    const header = line.match(/^\[\d{4}-\d{2}-\d{2} [\d:]+\]\s[^\s]+\.(\w+):/);
    if (header) entries.push({ level: header[1].toUpperCase(), lines: [line] });
    else if (entries.length) entries[entries.length - 1].lines.push(line);
    else if (line.trim()) entries.push({ level: '', lines: [line] });
  }
  const query = search.trim().toLowerCase();
  return entries
    .filter((entry) => {
      const levels =
        level === 'ERROR'
          ? ['ERROR', 'CRITICAL', 'EMERGENCY', 'ALERT']
          : ['INFO', 'DEBUG', 'WARNING', 'NOTICE'];
      return (
        (level === 'ALL' || levels.includes(entry.level)) &&
        (!query || entry.lines.join('\n').toLowerCase().includes(query))
      );
    })
    .flatMap((entry) => entry.lines);
}
