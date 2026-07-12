'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';
import {
  UploadCloud,
  Settings,
  MessageSquare,
  Trash2,
  RefreshCw,
  FileText,
  Users,
  Clock,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  details?: string;
  timestamp: string;
  user?: string;
}

const actionIcons: Record<string, typeof UploadCloud> = {
  upload: UploadCloud,
  settings: Settings,
  chat: MessageSquare,
  delete: Trash2,
  reindex: RefreshCw,
  document: FileText,
  member: Users,
};

const getActionColor = (action: string) => {
  if (action.includes('upload') || action.includes('create')) return 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20';
  if (action.includes('delete') || action.includes('remove')) return 'text-accent-rose bg-accent-rose/10 border-accent-rose/20';
  if (action.includes('setting') || action.includes('update')) return 'text-accent-amber bg-accent-amber/10 border-accent-amber/20';
  if (action.includes('chat') || action.includes('message')) return 'text-accent-violet bg-accent-violet/10 border-accent-violet/20';
  return 'text-text-muted bg-surface-2 border-border-hairline';
};

export default function ActivityFeed() {
  const { data: activities = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['activity'],
    queryFn: api.getActivity,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted">
        <Clock className="h-5 w-5 animate-spin text-accent-violet mr-2" />
        <span className="text-xs font-mono">Loading activity feed...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border-hairline rounded-xl p-8 bg-surface-1 text-text-muted">
        <Clock className="h-8 w-8 mx-auto mb-3 text-text-muted" />
        <span className="text-xs font-mono">No recent activity recorded yet.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((item) => {
        const IconComponent = actionIcons[item.action.split('_')[0]] || Clock;
        const colorClass = getActionColor(item.action);
        const timeAgo = getTimeAgo(item.timestamp);

        return (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3.5 rounded-xl border border-border-hairline bg-surface-1 hover:bg-surface-2/40 transition-all duration-200"
          >
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center border shrink-0 ${colorClass}`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary capitalize">
                  {item.action.replace(/_/g, ' ')}
                </span>
                {item.user && (
                  <span className="text-[9px] font-mono text-text-muted bg-surface-2 px-1.5 py-0.5 rounded border border-border-hairline">
                    {item.user}
                  </span>
                )}
              </div>
              {item.details && (
                <p className="text-[10px] text-text-muted mt-0.5 truncate max-w-xs">
                  {item.details}
                </p>
              )}
            </div>
            <span className="text-[9px] font-mono text-text-muted shrink-0 whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}
