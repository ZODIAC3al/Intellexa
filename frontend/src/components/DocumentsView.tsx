'use client';

import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader,
  Plus,
  Sliders,
  Layers,
  ArrowRight,
  DatabaseZap,
  Info
} from 'lucide-react';
import { DocumentInfo, Collection } from '../../../shared/types';

export default function DocumentsView() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settings = useSelector((state: RootState) => state.rag);
  const [selectedCollectionId, setSelectedCollectionId] = useState('default');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number }[]>([]);

  // Fetch Documents
  const { data: documents = [], isLoading: docsLoading } = useQuery<DocumentInfo[]>({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
    refetchInterval: 3000,
  });

  // Fetch Collections
  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: api.getCollections,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, collectionId }: { file: File; collectionId: string }) =>
      api.uploadDocument(file, collectionId, settings.chunkSize, settings.chunkOverlap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setUploadingFiles([]);
      toast.success('Document uploaded and indexed successfully');
    },
    onError: (err: any) => {
      setUploadError(err.message || 'File upload failed');
      setUploadingFiles([]);
      toast.error(`Upload failed: ${err.message || 'Unknown error'}`);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Document deleted successfully');
    },
    onError: (err: any) => {
      toast.error(`Delete failed: ${err.message || 'Unknown error'}`);
    },
  });

  // Re-index Mutation
  const reindexMutation = useMutation({
    mutationFn: ({ id, collectionId }: { id: string; collectionId: string }) =>
      api.reindexDocument(id, collectionId, settings.chunkSize, settings.chunkOverlap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Document reindexed successfully');
    },
    onError: (err: any) => {
      toast.error(`Reindex failed: ${err.message || 'Unknown error'}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files[0]);
    }
  };

  const processUpload = (file: File) => {
    setUploadError(null);
    const validExtensions = ['.pdf', '.docx', '.txt', '.md', '.markdown'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(extension)) {
      setUploadError(`Unsupported file format. Supported: ${validExtensions.join(', ')}`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds the 50MB limit.');
      return;
    }

    // Check duplicate
    const isDuplicate = documents.some((d) => d.name === file.name && d.size === file.size);
    if (isDuplicate) {
      if (!confirm('This file has identical metadata to an existing index. Re-upload anyway?')) {
        return;
      }
    }

    setUploadingFiles([{ name: file.name, progress: 60 }]);
    uploadMutation.mutate({ file, collectionId: selectedCollectionId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete and de-index ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleReindex = (id: string) => {
    reindexMutation.mutate({ id, collectionId: selectedCollectionId });
  };

  // Render dynamic SVG progress ring based on status
  const renderProgressRing = (status: DocumentInfo['status']) => {
    const size = 36;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    let strokeDashoffset = circumference;
    let strokeColor = 'stroke-accent-cyan';
    let ringClass = '';

    if (status === 'completed') {
      strokeDashoffset = 0; // complete ring
    } else if (status === 'processing') {
      strokeDashoffset = circumference * 0.35; // 65% progress mock
      strokeColor = 'stroke-accent-violet';
      ringClass = 'animate-spin origin-center duration-3000';
    } else {
      // Failed
      strokeDashoffset = 0;
      strokeColor = 'stroke-accent-rose';
    }

    return (
      <div className="relative flex items-center justify-center h-9 w-9 shrink-0">
        <svg width={size} height={size} className={ringClass}>
          {/* Background circle */}
          <circle
            className="stroke-surface-2 fill-transparent"
            strokeWidth={strokeWidth}
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          {/* Progress circle */}
          <motion.circle
            className={`fill-transparent ${strokeColor} transition-all duration-500`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            strokeLinecap="round"
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {status === 'completed' && <CheckCircle className="h-4.5 w-4.5 text-accent-cyan" />}
          {status === 'processing' && <Clock className="h-3.5 w-3.5 text-accent-violet animate-pulse" />}
          {status === 'failed' && <AlertTriangle className="h-4.5 w-4.5 text-accent-rose" />}
        </div>
      </div>
    );
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
          <UploadCloud className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Document Workspace</h1>
          <p className="text-xs text-text-muted">Parsed research references cataloged securely on your local workspace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono block">
              Ingest Document
            </span>

            {/* Target select */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Target Collection</label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="w-full bg-surface-2 border border-border-hairline rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet transition-all"
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border-hairline hover:border-accent-violet/60 hover:bg-surface-2/20 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.docx,.txt,.md,.markdown"
              />
              <UploadCloud className="h-9 w-9 text-text-muted group-hover:text-accent-violet group-hover:scale-105 transition-all mb-3.5" />
              <span className="text-xs font-bold text-text-primary">Drag & Drop Research File</span>
              <p className="text-[10px] text-text-muted mt-2 leading-relaxed max-w-[200px]">
                PDF, DOCX, TXT, or MD up to 50MB. Exclusively parsed locally.
              </p>
            </div>

            {/* Pseudo Progress loaders */}
            {uploadingFiles.map((f, idx) => (
              <div key={idx} className="bg-surface-2 border border-border-hairline p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="truncate text-text-primary font-bold max-w-[140px]">{f.name}</span>
                  <span className="text-accent-violet font-semibold">Parser chunking...</span>
                </div>
                <div className="w-full h-1 bg-surface-0 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-violet rounded-full transition-all duration-500 animate-pulse"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              </div>
            ))}

            {/* Upload errors */}
            {uploadError && (
              <div className="flex gap-2.5 items-start bg-accent-rose/10 border border-accent-rose/25 p-3 rounded-lg text-accent-rose text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-sans">{uploadError}</span>
              </div>
            )}
          </div>

          {/* preset config guide */}
          <div className="rounded-xl border border-border-hairline bg-surface-1 p-4 flex gap-3 text-xs leading-relaxed text-text-muted">
            <Info className="h-4.5 w-4.5 text-accent-violet shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-text-primary block font-mono text-[10px] uppercase">Indexing Parameters</span>
              <p className="text-[10px]">
                Parsed using active parameters: **Chunk size: {settings.chunkSize} tokens**, **Overlap: {settings.chunkOverlap} tokens**. Adjust these variables inside Settings.
              </p>
            </div>
          </div>
        </div>

        {/* Card Grid Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">
              Indexed Catalog ({documents.length})
            </span>
          </div>

          {docsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Loader className="h-6 w-6 animate-spin text-accent-violet mb-2" />
              <span className="text-xs font-mono">Loading registry...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border-hairline rounded-xl p-8 bg-surface-1 text-text-muted text-xs font-mono">
              No files currently cataloged.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-border-hairline bg-surface-1 p-4 flex flex-col justify-between hover:border-accent-violet/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-text-primary block truncate max-w-[200px]" title={doc.name}>
                        {doc.name}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono block mt-1">
                        chunks: {doc.chunksCount} · overlap: {settings.chunkOverlap}
                      </span>
                    </div>
                    {renderProgressRing(doc.status)}
                  </div>

                  <div className="flex items-center justify-between border-t border-border-hairline/60 pt-3 mt-4">
                    <span className="text-[9px] font-mono text-text-muted">
                      {(doc.size / 1024).toFixed(1)} KB · PDF Parse
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Retry on fail / reindex */}
                      <button
                        onClick={() => handleReindex(doc.id)}
                        disabled={reindexMutation.isPending}
                        className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-accent-violet transition-all"
                        title="Reindex source file"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${reindexMutation.isPending && reindexMutation.variables?.id === doc.id ? 'animate-spin' : ''}`} />
                      </button>
                      <a
                        href={api.downloadDocumentUrl(doc.id)}
                        download={doc.name}
                        className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-accent-cyan transition-all"
                        title="Download original file"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id, doc.name)}
                        disabled={deleteMutation.isPending}
                        className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-accent-rose transition-all"
                        title="De-index & delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </motion.div>
  );
}
