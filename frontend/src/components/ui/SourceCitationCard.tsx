'use client';

import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';

interface SourceCitationCardProps {
  documentName: string;
  pageNumber?: number;
  chunkIndex: number;
  similarity: number;
  text: string;
  onClick?: () => void;
  className?: string;
}

export default function SourceCitationCard({
  documentName,
  pageNumber,
  chunkIndex,
  similarity,
  text,
  onClick,
  className = '',
}: SourceCitationCardProps) {
  // Similarity score coloring mapping
  const getScoreColor = (score: number) => {
    if (score >= 0.85) return 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20';
    if (score >= 0.7) return 'text-accent-amber bg-accent-amber/10 border-accent-amber/20';
    return 'text-text-muted bg-surface-2 border-border-hairline';
  };

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col p-3 rounded-lg border border-border-hairline bg-surface-1 text-text-primary hover:bg-surface-2 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-accent-violet shrink-0" />
          <span className="font-sans font-medium text-xs truncate text-text-primary" title={documentName}>
            {documentName}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-text-muted">
            Page {pageNumber || 'N/A'} · Chunk {chunkIndex}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium ${getScoreColor(
              similarity
            )}`}
          >
            {(similarity * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      
      <p className="text-xs text-text-muted line-clamp-2 font-sans leading-relaxed flex-1 select-none">
        {text}
      </p>

      {onClick && (
        <div className="mt-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-accent-violet font-medium font-sans">Inspect Chunk</span>
          <ExternalLink className="h-2.5 w-2.5 text-accent-violet" />
        </div>
      )}
    </div>
  );
}
