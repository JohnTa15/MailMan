import { format, isThisYear, isToday, isYesterday, formatDistanceToNowStrict } from 'date-fns';

export function formatListDate(value: string) {
  const date = new Date(value);
  if (Date.now() - date.getTime() < 60 * 60 * 1000) {
    return formatDistanceToNowStrict(date, { addSuffix: false }).replace(/ minutes?/, 'm').replace(/ seconds?/, 's');
  }
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return isThisYear(date) ? format(date, 'MMM d') : format(date, 'MMM d, yyyy');
}

export function formatFullDate(value: string) {
  return format(new Date(value), "EEE, MMM d, yyyy 'at' h:mm a");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function senderName(email: { fromName?: string; from: string }) {
  return email.fromName || email.from.split('@')[0] || 'Unknown';
}
