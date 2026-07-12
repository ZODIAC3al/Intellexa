'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FolderHeart,
  FolderPlus,
  Plus,
  Trash2,
  FileText,
  X,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react';
import { Collection, DocumentInfo } from '../../../shared/types';
import Button from './ui/Button';

export default function CollectionsView() {
  const queryClient = useQueryClient();

  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  const { data: collections = [], isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: api.getCollections,
  });

  const { data: documents = [] } = useQuery<DocumentInfo[]>({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
  });

  const createCollectionMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      api.createCollection(name, description),
    onSuccess: (newCol) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setNewCollectionName('');
      setNewCollectionDesc('');
      setActiveCollectionId(newCol.id);
      toast.success('Collection created successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to create collection: ${err.message}`);
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: api.deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setActiveCollectionId(null);
      toast.success('Collection deleted successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to delete collection: ${err.message}`);
    },
  });

  const updateCollectionMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      api.updateCollection(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection updated successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to update collection: ${err.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCollectionName.trim()) {
      createCollectionMutation.mutate({
        name: newCollectionName.trim(),
        description: newCollectionDesc.trim() || undefined,
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete collection "${name}"? This deletes its vector search indexes.`)) {
      deleteCollectionMutation.mutate(id);
    }
  };

  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const activeColDocs = activeCollection
    ? documents.filter((d) => activeCollection.documentIds.includes(d.id))
    : [];

  const availableDocsToAdd = activeCollection
    ? documents.filter((d) => !activeCollection.documentIds.includes(d.id) && d.status === 'completed')
    : [];

  const handleAddDocument = (docId: string) => {
    if (!activeCollection) return;
    const updatedIds = [...activeCollection.documentIds, docId];
    updateCollectionMutation.mutate({
      id: activeCollection.id,
      updates: { documentIds: updatedIds },
    });
    setIsAddingDoc(false);
  };

  const handleRemoveDocument = (docId: string) => {
    if (!activeCollection) return;
    const updatedIds = activeCollection.documentIds.filter((id) => id !== docId);
    updateCollectionMutation.mutate({
      id: activeCollection.id,
      updates: { documentIds: updatedIds },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto bg-surface-0 p-5 lg:p-8 space-y-6 scrollbar-thin select-none"
    >
      
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent-violet-soft border border-accent-violet/20 flex items-center justify-center text-accent-violet shadow-sm animate-pulse">
          <FolderHeart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Collections Workspace</h1>
          <p className="text-xs text-text-muted">Isolate vector databases by grouping related papers into dedicated knowledge bases.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="space-y-6">
          <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-accent-violet" />
              New Collection
            </span>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Deep Learning, Medical Science"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full bg-surface-2 border border-border-hairline rounded-lg py-2 px-3 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the topics covered in this catalog..."
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  className="w-full bg-surface-2 border border-border-hairline rounded-lg py-2 px-3 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet transition-all"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full py-2.5">
                Create Collection
              </Button>
            </form>
          </div>

          <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent-violet" />
              Existing Collections ({collections.length})
            </span>

            <div className="space-y-2">
              {collectionsLoading ? (
                <div className="text-center py-6 text-xs text-text-muted font-mono">Loading collections...</div>
              ) : collections.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-muted font-mono">No collections found.</div>
              ) : (
                collections.map((col) => {
                  const isActive = activeCollectionId === col.id;
                  return (
                    <div key={col.id} className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveCollectionId(col.id)}
                        className={`flex-1 flex items-center justify-between p-3.5 rounded-lg text-left border transition-all duration-200 ${
                          isActive
                            ? 'bg-accent-violet-soft border-accent-violet/30 text-text-primary shadow-sm font-semibold'
                            : 'bg-surface-2/40 border-border-hairline text-text-muted hover:text-text-primary hover:bg-surface-2'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5 text-text-primary">
                            {col.name}
                          </div>
                          <p className="text-[10px] text-text-muted truncate leading-relaxed">
                            {col.description || 'Topic workspace for local search.'}
                          </p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-surface-2 text-[9px] font-bold font-mono text-text-muted border border-border-hairline shrink-0 ml-3">
                          {col.documentIds.length} files
                        </span>
                      </button>
                      {col.id !== 'default' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(col.id, col.name);
                          }}
                          className="p-1 hover:bg-accent-rose/10 text-text-muted hover:text-accent-rose rounded transition-colors shrink-0"
                          title="Delete Collection"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {activeCollection ? (
            <div className="rounded-xl border border-border-hairline bg-surface-1 p-6 shadow-sm space-y-6 min-h-[450px] flex flex-col justify-between">
              
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-border-hairline pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-accent-violet" />
                      <h2 className="text-sm font-bold text-text-primary">{activeCollection.name}</h2>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {activeCollection.description || 'Topic catalog details and document mappings.'}
                    </p>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setIsAddingDoc(!isAddingDoc)}
                      disabled={availableDocsToAdd.length === 0}
                      className="flex items-center gap-1.5 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-surface-2 border border-border-hairline hover:border-accent-violet/30 text-text-muted hover:text-text-primary transition-all disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" /> Link Document
                    </button>

                    {isAddingDoc && availableDocsToAdd.length > 0 && (
                      <div className="absolute right-0 top-10 z-50 w-64 bg-surface-1 border border-border-hairline rounded-xl shadow-2xl p-2.5 space-y-1">
                        <div className="flex justify-between items-center px-1 pb-1.5 border-b border-border-hairline">
                          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider font-mono">Select Completed Doc</span>
                          <button onClick={() => setIsAddingDoc(false)} className="text-text-muted hover:text-text-primary">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1 scrollbar-thin">
                          {availableDocsToAdd.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => handleAddDocument(doc.id)}
                              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-2 text-left text-[11px] text-text-primary truncate"
                            >
                              <FileText className="h-3.5 w-3.5 text-accent-violet shrink-0" />
                              <span className="truncate">{doc.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono block mb-3">
                    Assigned Reference Documents ({activeColDocs.length})
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeColDocs.length === 0 ? (
                      <div className="col-span-2 text-center py-16 text-text-muted text-xs leading-relaxed bg-surface-2/40 border border-border-hairline border-dashed rounded-xl p-6">
                        No documents associated with this collection.<br />Click **Link Document** to connect files.
                      </div>
                    ) : (
                      activeColDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border-hairline hover:border-accent-violet/20 transition-all duration-200"
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-2.5">
                            <FileText className="h-4 w-4 text-accent-violet shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-text-primary truncate pr-2 block" title={doc.name}>
                                {doc.name}
                              </span>
                              <span className="text-[9px] text-text-muted font-mono mt-0.5 block">
                                {doc.chunksCount} chunks · {(doc.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="p-1 hover:bg-accent-rose/10 text-text-muted hover:text-accent-rose rounded transition-colors shrink-0"
                            title="Unlink document"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {activeColDocs.length > 0 && (
                <div className="border-t border-border-hairline pt-4 flex justify-between items-center text-xs">
                  <span className="text-text-muted">Collection sync complete</span>
                  <button
                    onClick={() => {
                      // Handled by user switching side tab views
                    }}
                    className="font-bold text-accent-violet hover:text-accent-violet/85 flex items-center gap-1.5 group transition-all"
                  >
                    Open RAG Workbench <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="rounded-xl border border-border-hairline bg-surface-1 p-6 shadow-sm flex flex-col items-center justify-center text-center py-24 space-y-4">
              <FolderHeart className="h-10 w-10 text-text-muted" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-text-primary">No Collection Selected</span>
                <p className="text-[10px] text-text-muted max-w-xs leading-relaxed">
                  Select an existing collection database from the registry left column to inspect its mappings.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </motion.div>
  );
}