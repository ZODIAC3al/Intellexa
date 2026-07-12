import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';
import RetrievalScoreDistribution from '../dashboard/RetrievalScoreDistribution';
import { Sliders, Eye, EyeOff, RotateCcw, AlertCircle } from 'lucide-react';

interface Chunk {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  similarity: number;
  text: string;
  pageNumber?: number;
}

interface RagDebugPanelProps {
  question: string;
  collectionId: string;
  topK: number;
  minScore: number;
  retrievalStrategy: 'similarity' | 'mmr';
  onRegenerate: (overrideChunks: string[]) => void;
  onClose: () => void;
  isGenerating?: boolean;
}

export default function RagDebugPanel({
  question,
  collectionId,
  topK,
  minScore,
  retrievalStrategy,
  onRegenerate,
  onClose,
  isGenerating = false,
}: RagDebugPanelProps) {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());

  const { data: retrievedChunks = [], isLoading, error } = useQuery({
    queryKey: ['localRetrieve', question, collectionId, topK, minScore, retrievalStrategy],
    queryFn: () => api.retrieveLocalChunks(question, collectionId, topK, minScore, retrievalStrategy),
    enabled: !!question,
  });

  useEffect(() => {
    if (retrievedChunks) {
      setChunks(retrievedChunks);
      setExcludedIndices(new Set());
    }
  }, [retrievedChunks]);

  const toggleExclude = (index: number) => {
    setExcludedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleRegenerate = () => {
    const includedTexts = chunks
      .filter((_, idx) => !excludedIndices.has(idx))
      .map((c) => c.text);
    onRegenerate(includedTexts);
  };

  const chartData = chunks.map((c, idx) => ({
    chunkIndex: `C${idx + 1}`,
    score: c.similarity,
  }));

  return (
    <div className="w-80 h-full bg-base-200 border-l border-neutral flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral flex justify-between items-center bg-base-300">
        <h3 className="font-bold text-xs text-base-content flex items-center gap-1.5 uppercase tracking-wider">
          <Sliders className="h-4 w-4 text-primary animate-pulse" /> RAG Debug Engine
        </h3>
        <button onClick={onClose} className="btn btn-ghost btn-xs">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 scrollbar-thin">
        {/* Score Distribution Chart */}
        <div className="card bg-base-300 border border-neutral p-4">
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : (
            <RetrievalScoreDistribution data={chartData} />
          )}
        </div>

        {/* Chunks List */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-mono text-neutral-content uppercase tracking-wider px-1">
            Retrieved Context Chunks ({chunks.length})
          </span>

          {isLoading ? (
            <div className="text-center py-6">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : error ? (
            <div className="alert alert-error text-xs p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Failed to fetch local vector matches.</span>
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center text-xs text-neutral-content py-6">No matching chunks found.</div>
          ) : (
            chunks.map((chunk, idx) => {
              const isExcluded = excludedIndices.has(idx);
              return (
                <div
                  key={idx}
                  className={`card border p-3 flex flex-col gap-2 transition-all ${
                    isExcluded
                      ? 'bg-base-200/50 border-neutral/40 opacity-50'
                      : 'bg-base-300 border-neutral/80 hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-neutral-content">
                      C{idx + 1}: {chunk.documentName.slice(0, 16)}...
                      {chunk.pageNumber && ` (p. ${chunk.pageNumber})`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {Math.round(chunk.similarity * 100)}%
                      </span>
                      <button
                        onClick={() => toggleExclude(idx)}
                        className="btn btn-ghost btn-circle btn-xs text-neutral-content hover:text-base-content"
                        title={isExcluded ? 'Include Chunk' : 'Exclude Chunk'}
                      >
                        {isExcluded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-base-content/90 font-mono leading-relaxed line-clamp-3 select-none">
                    {chunk.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Actions footer */}
      <div className="p-4 border-t border-neutral bg-base-300 flex flex-col gap-2">
        <button
          onClick={handleRegenerate}
          disabled={isGenerating || chunks.length === 0}
          className="btn btn-primary btn-sm w-full flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Regenerate context
        </button>
      </div>
    </div>
  );
}
