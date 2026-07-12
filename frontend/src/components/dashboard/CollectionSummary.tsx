'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';
import { useDispatch } from 'react-redux';
import { setView } from '../../redux/slices/uiSlice';
import { FolderHeart, FileText, ChevronRight } from 'lucide-react';
import { Collection, DocumentInfo } from '../../../../shared/types';

export default function CollectionSummary() {
  const dispatch = useDispatch();

  const { data: collections = [], isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: api.getCollections,
  });

  const { data: documents = [] } = useQuery<DocumentInfo[]>({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
  });

  if (collectionsLoading) {
    return (
      <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-surface-2 rounded w-1/3" />
          <div className="h-3 bg-surface-2 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (collections.length === 0) return null;

  return (
    <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest font-mono flex items-center gap-1.5">
          <FolderHeart className="h-3.5 w-3.5 text-accent-cyan" />
          Knowledge Collections
        </h3>
        <button
          onClick={() => dispatch(setView('collections'))}
          className="text-[10px] font-bold text-accent-violet hover:underline flex items-center gap-0.5"
        >
          View All <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2">
        {collections.slice(0, 4).map((col) => {
          const docCount = col.documentIds.length;
          const colDocs = documents.filter((d) => col.documentIds.includes(d.id));
          const totalSize = colDocs.reduce((acc, d) => acc + d.size, 0);

          return (
            <div
              key={col.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border-hairline bg-surface-2/40 hover:bg-surface-2 transition-all duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan shrink-0">
                  <FolderHeart className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-primary truncate block max-w-[180px]">
                    {col.name}
                  </span>
                  <span className="text-[9px] text-text-muted font-mono block mt-0.5">
                    {docCount} file{docCount !== 1 ? 's' : ''} · {(totalSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              <FileText className="h-3.5 w-3.5 text-text-muted shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
