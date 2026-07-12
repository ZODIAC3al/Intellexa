'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { motion } from 'framer-motion';
import {
  Search,
  FileText,
  Loader,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface SearchResult {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  similarity: number;
  text: string;
  pageNumber?: number;
}

export default function SearchView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const { data, isLoading, error } = useQuery<{ results: SearchResult[]; durationMs: number }>({
    queryKey: ['search', submittedQuery],
    queryFn: () => api.search(submittedQuery),
    enabled: submittedQuery.length > 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSubmittedQuery(searchQuery.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto bg-surface-0 p-5 lg:p-8 space-y-6 scrollbar-thin select-none"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent-violet-soft border border-accent-violet/20 flex items-center justify-center text-accent-violet shadow-sm">
          <Search className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Global Search</h1>
          <p className="text-xs text-text-muted">Search across all indexed documents and knowledge collections.</p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents, collections, and content..."
          className="w-full pl-12 pr-28 py-3.5 rounded-xl border border-border-hairline bg-surface-1 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-violet/40 focus:border-accent-violet transition-all shadow-sm font-sans"
        />
        <button
          type="submit"
          disabled={!searchQuery.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-accent-violet text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-violet/90 transition-all disabled:opacity-50 shrink-0"
        >
          {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Results */}
      {error && (
        <div className="flex gap-2.5 items-start bg-accent-rose/10 border border-accent-rose/25 p-4 rounded-xl text-accent-rose text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">Search failed. Please try again.</span>
        </div>
      )}

      {data && data.results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">
              {data.results.length} Result{data.results.length !== 1 ? 's' : ''} Found
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              {data.durationMs}ms
            </span>
          </div>

          <div className="space-y-3">
            {data.results.map((result, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm hover:border-accent-violet/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-accent-violet shrink-0" />
                    <span className="text-xs font-bold text-text-primary truncate">
                      {result.documentName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result.pageNumber && (
                      <span className="text-[9px] font-mono text-text-muted bg-surface-2 px-1.5 py-0.5 rounded border border-border-hairline">
                        Page {result.pageNumber}
                      </span>
                    )}
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      result.similarity >= 0.75
                        ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                        : result.similarity >= 0.5
                        ? 'bg-accent-amber/10 text-accent-amber border-accent-amber/20'
                        : 'bg-surface-2 text-text-muted border-border-hairline'
                    }`}>
                      {(result.similarity * 100).toFixed(0)}% match
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-muted leading-relaxed line-clamp-4 font-sans">
                  {result.text}
                </p>
                <div className="mt-3 pt-2 border-t border-border-hairline/60 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-text-muted">Chunk #{result.chunkIndex}</span>
                  <button
                    onClick={() => {
                      const event = new CustomEvent('search-navigate', { detail: { documentId: result.documentId } });
                      window.dispatchEvent(event);
                    }}
                    className="text-[10px] font-bold text-accent-violet hover:underline flex items-center gap-0.5"
                  >
                    View Source <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {data && data.results.length === 0 && submittedQuery && (
        <div className="text-center py-16 border border-dashed border-border-hairline rounded-xl p-8 bg-surface-1 text-text-muted">
          <Search className="h-8 w-8 mx-auto mb-3 text-text-muted" />
          <span className="text-xs font-mono block">No results found for &ldquo;{submittedQuery}&rdquo;</span>
          <p className="text-[10px] text-text-muted mt-2">Try different keywords or check your document collections.</p>
        </div>
      )}

      {!submittedQuery && (
        <div className="text-center py-16 border border-dashed border-border-hairline rounded-xl p-8 bg-surface-1 text-text-muted">
          <Search className="h-8 w-8 mx-auto mb-3 text-text-muted" />
          <span className="text-xs font-mono block">Enter a query to search across all indexed documents</span>
          <p className="text-[10px] text-text-muted mt-2">Search uses vector similarity to find the most relevant content.</p>
        </div>
      )}
    </motion.div>
  );
}
