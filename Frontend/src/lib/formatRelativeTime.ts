/** Formats an ISO UTC/local timestamp for activity feeds. */
export function formatRelativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  const days = Math.floor(diffSec / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString();
}
