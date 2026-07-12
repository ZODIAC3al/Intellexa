export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    // Mode indicators
    case 'local':
    case 'healthy':
    case 'online':
    case 'completed':
    case 'active':
    case 'success':
      return 'badge-secondary';

    case 'cloud':
    case 'warning':
    case 'processing':
    case 'queued':
      return 'badge-accent';

    case 'failed':
    case 'error':
    case 'offline':
      return 'badge-error';

    default:
      return 'badge-ghost';
  }
}
