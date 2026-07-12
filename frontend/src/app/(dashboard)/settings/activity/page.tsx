'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { FileClock, User, History } from 'lucide-react';

export default function WorkspaceActivityPage() {
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ['workspaceActivity'],
    queryFn: api.getActivity,
  });

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Workspace Activity Feed
        </h2>
        <p className="text-xs text-neutral-content mt-1">
          A transparency audit log showing all modifications, documents uploaded, and settings adjusted.
        </p>
      </div>

      <div className="card bg-base-200 border border-neutral p-5">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-xs text-neutral-content">No activities logged yet</div>
        ) : (
          <div className="flex flex-col gap-4">
            {logs.map((log) => (
              <div key={log._id} className="flex gap-4 items-start border-b border-neutral/40 pb-4 last:border-b-0 last:pb-0">
                <div className="p-2 rounded-lg bg-base-300 border border-neutral">
                  <FileClock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-base-content">
                      {log.userId?.name || 'System'}
                    </span>
                    <span className="text-[10px] text-neutral-content">
                      ({log.userId?.email || 'System Action'})
                    </span>
                  </div>
                  <p className="text-xs text-base-content/90 mt-1 leading-relaxed">{log.action}</p>
                  <span className="text-[9px] font-mono text-neutral-content/60 mt-1.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
