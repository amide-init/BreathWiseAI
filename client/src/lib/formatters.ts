export function formatObservedRelative(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) {
    return 'Timestamp unavailable';
  }
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Timestamp unavailable';
  }
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatMeasurement(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Unavailable';
  }
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
}

export function formatCo2Kg(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0.00 kg CO2e';
  }
  return `${value.toFixed(2)} kg CO2e`;
}
