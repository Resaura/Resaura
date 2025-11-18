export function formatDurationLong(minutes?: number | null) {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) {
    return '--';
  }
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours > 0) {
    return `${hours}h${String(mins).padStart(2, '0')} minutes`;
  }
  const unit = safe === 1 ? 'minute' : 'minutes';
  return `${safe} ${unit}`;
}
