'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { updateRagSettings, resetRagSettings } from '../redux/slices/ragSlice';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Settings,
  SlidersHorizontal,
  Bot,
  Trash2,
  RefreshCw,
  Info,
  Database,
} from 'lucide-react';

export default function SettingsView() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const settings = useSelector((state: RootState) => state.rag);

  // Clear History Mutation
  const clearHistoryMutation = useMutation({
    mutationFn: () => {
      // workspaceId is resolved on backend from cookies, but type checks might require empty string or dummy
      return api.clearHistory();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Conversation history wiped successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to clear history: ${err.message || 'Unknown error'}`);
    },
  });

  const handleSliderChange = (key: keyof typeof settings, val: number) => {
    dispatch(updateRagSettings({ [key]: val }));
  };

  const handleTextChange = (key: keyof typeof settings, val: any) => {
    dispatch(updateRagSettings({ [key]: val }));
  };

  const handleWipeHistory = () => {
    if (
      confirm(
        'WARNING: This will permanently delete all conversations and message logs. This action is irreversible. Proceed?'
      )
    ) {
      clearHistoryMutation.mutate();
    }
  };

  const cloudModels = [
    { id: 'meta-llama/Llama-3-8b-instruct', name: 'Meta Llama 3 8B Instruct (Recommended)' },
    { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B Instruct v0.3' },
    { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B Beta' },
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B Instruct (Heavy)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto bg-surface-0 p-5 lg:p-8 space-y-6 scrollbar-thin select-none text-text-primary"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent-violet-soft border border-accent-violet/20 flex items-center justify-center text-accent-violet shadow-sm">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">System Settings</h1>
          <p className="text-xs text-text-muted">Manage your system prompts, model hyper-parameters, and offline storage options.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Generation Params */}
          <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm space-y-6">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 font-mono">
              <SlidersHorizontal className="h-4 w-4 text-accent-violet" />
              Inference Parameters
            </h2>

            <div className="space-y-5">
              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <label className="text-text-primary">Temperature</label>
                  <span className="font-mono text-accent-violet bg-accent-violet-soft px-2 py-0.5 rounded font-bold">
                    {settings.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.2"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) => handleSliderChange('temperature', parseFloat(e.target.value))}
                  className="w-full h-1 bg-surface-2 rounded appearance-none cursor-pointer accent-accent-violet"
                />
                <div className="flex justify-between text-[9px] text-text-muted font-bold uppercase tracking-wider font-mono">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Top P */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <label className="text-text-primary">Top-P (Nucleus Sampling)</label>
                  <span className="font-mono text-accent-violet bg-accent-violet-soft px-2 py-0.5 rounded font-bold">
                    {settings.topP}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.topP}
                  onChange={(e) => handleSliderChange('topP', parseFloat(e.target.value))}
                  className="w-full h-1 bg-surface-2 rounded appearance-none cursor-pointer accent-accent-violet"
                />
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <label className="text-text-primary">Max Generation Tokens</label>
                  <span className="font-mono text-accent-violet bg-accent-violet-soft px-2 py-0.5 rounded font-bold">
                    {settings.maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min="128"
                  max="4096"
                  step="64"
                  value={settings.maxTokens}
                  onChange={(e) => handleSliderChange('maxTokens', parseInt(e.target.value))}
                  className="w-full h-1 bg-surface-2 rounded appearance-none cursor-pointer accent-accent-violet"
                />
              </div>

              {/* Streaming toggle */}
              <div className="flex justify-between items-center py-2.5 border-t border-border-hairline">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-text-primary">Enable Streaming</label>
                  <p className="text-[10px] text-text-muted">Stream tokens dynamically as they generate</p>
                </div>
                <button
                  onClick={() => handleTextChange('streamingEnabled', !settings.streamingEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.streamingEnabled ? 'bg-accent-violet' : 'bg-surface-2 border border-border-hairline'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.streamingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* TTS toggle */}
              <div className="flex justify-between items-center py-2.5 border-t border-border-hairline">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-text-primary">Auto-Read Responses</label>
                  <p className="text-[10px] text-text-muted">Read assistant responses aloud automatically using Text-to-Speech</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTextChange('ttsEnabled', !settings.ttsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.ttsEnabled ? 'bg-accent-violet' : 'bg-surface-2 border border-border-hairline'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.ttsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* RAG Settings */}
          <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm space-y-6">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 font-mono">
              <Database className="h-4 w-4 text-accent-violet" />
              Retrieval-Augmented Generation (RAG) Settings
            </h2>

            <div className="space-y-4">
              {/* Preset selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-text-muted font-medium">RAG Quality Preset</label>
                <select
                  value={settings.qualityMode}
                  onChange={(e) => handleTextChange('qualityMode', e.target.value)}
                  className="w-full bg-surface-2 border border-border-hairline rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet"
                >
                  <option value="fast">Fast (Chunk: 256, Overlap: 50, Top-K: 3)</option>
                  <option value="balanced">Balanced (Chunk: 512, Overlap: 100, Top-K: 5)</option>
                  <option value="high_accuracy">High Accuracy (Chunk: 1024, Overlap: 150, Top-K: 8)</option>
                  <option value="custom">Custom (Modify Parameters Manually)</option>
                </select>
              </div>

              {/* Chunk params */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted font-medium">Chunk Size (Tokens)</label>
                  <select
                    value={settings.chunkSize}
                    disabled={settings.qualityMode !== 'custom'}
                    onChange={(e) => handleSliderChange('chunkSize', parseInt(e.target.value))}
                    className="w-full bg-surface-2 border border-border-hairline rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet disabled:opacity-40"
                  >
                    <option value="256">Small (256 tokens)</option>
                    <option value="512">Medium (512 tokens)</option>
                    <option value="1024">Large (1024 tokens)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted font-medium">Chunk Overlap (Tokens)</label>
                  <select
                    value={settings.chunkOverlap}
                    disabled={settings.qualityMode !== 'custom'}
                    onChange={(e) => handleSliderChange('chunkOverlap', parseInt(e.target.value))}
                    className="w-full bg-surface-2 border border-border-hairline rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet disabled:opacity-40"
                  >
                    <option value="50">50 tokens</option>
                    <option value="100">100 tokens</option>
                    <option value="150">150 tokens</option>
                    <option value="200">200 tokens</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted font-medium">Top-K Retrieval</label>
                  <select
                    value={settings.topK}
                    disabled={settings.qualityMode !== 'custom'}
                    onChange={(e) => handleSliderChange('topK', parseInt(e.target.value))}
                    className="w-full bg-surface-2 border border-border-hairline rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet disabled:opacity-40"
                  >
                    <option value="2">2 chunks</option>
                    <option value="3">3 chunks</option>
                    <option value="5">5 chunks</option>
                    <option value="8">8 chunks</option>
                    <option value="10">10 chunks</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-text-muted font-medium">Retrieval Strategy</label>
                  <select
                    value={settings.retrievalStrategy}
                    onChange={(e) => handleTextChange('retrievalStrategy', e.target.value)}
                    className="w-full bg-surface-2 border border-border-hairline rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet"
                  >
                    <option value="similarity">Similarity Search</option>
                    <option value="mmr">Max Marginal Relevance (MMR)</option>
                  </select>
                </div>
              </div>

              {/* Threshold */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <label className="text-text-primary">Similarity Threshold</label>
                  <span className="font-mono text-accent-violet bg-accent-violet-soft px-2 py-0.5 rounded font-bold">
                    {settings.similarityThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="0.95"
                  step="0.05"
                  value={settings.similarityThreshold}
                  onChange={(e) => handleSliderChange('similarityThreshold', parseFloat(e.target.value))}
                  className="w-full h-1 bg-surface-2 rounded appearance-none cursor-pointer accent-accent-violet"
                />
                <p className="text-[10px] text-text-muted leading-relaxed font-normal">
                  Chunks with similarity lower than this score will be excluded from context query inputs.
                </p>
              </div>

              {/* Info box */}
              <div className="rounded-lg bg-surface-2 border border-border-hairline p-3.5 flex gap-2 items-start text-[10px] text-text-muted leading-relaxed font-normal">
                <Info className="h-4 w-4 text-accent-violet shrink-0 mt-0.5" />
                <span>
                  <strong>Important:</strong> Chunk sizes and overlaps are locked during document uploads. Re-indexing existing files will apply your updated parameters. Similarity threshold and Top-K changes take effect instantly.
                </span>
              </div>
            </div>
          </div>

          {/* System Instructions */}
          <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 font-mono">
              <Bot className="h-4 w-4 text-accent-violet" />
              Base System Prompt
            </h2>

            <div className="space-y-2">
              <textarea
                value={settings.systemPrompt}
                onChange={(e) => handleTextChange('systemPrompt', e.target.value)}
                rows={5}
                className="w-full bg-surface-2 border border-border-hairline rounded-lg p-3 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet font-mono leading-relaxed"
                placeholder="Write custom base model instructions here..."
              />
              <p className="text-[9px] text-text-muted">
                This prompt will override the default behavior of the Cloud AI assistant. It governs constraints, style, and programming details.
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: Configurations & Danger zone */}
        <div className="space-y-6">
          
          {/* Cloud Models */}
          <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 font-mono">
              <Bot className="h-4 w-4 text-accent-violet" />
              Model Configuration
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-text-muted font-medium">Cloud Chat Model</label>
                <select
                  value={settings.cloudModel}
                  onChange={(e) => handleTextChange('cloudModel', e.target.value)}
                  className="w-full bg-surface-2 border border-border-hairline rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-violet focus:border-accent-violet"
                >
                  {cloudModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-surface-2 border border-border-hairline p-4 space-y-2">
                <div className="flex gap-2.5 items-start">
                  <Info className="h-4 w-4 text-accent-violet shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-text-primary">Local Inference Model</span>
                    <p className="text-[10px] text-text-muted leading-relaxed font-normal">
                      Local assistant connects entirely offline to **Ollama** running locally on your computer.
                    </p>
                  </div>
                </div>
                <div className="border-t border-border-hairline pt-2 flex justify-between text-[10px] text-text-muted font-mono font-bold">
                  <span>Chat: <strong className="text-accent-violet">llama3.2</strong></span>
                  <span>Embeddings: <strong className="text-accent-violet">nomic-embed-text</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-accent-rose uppercase tracking-widest flex items-center gap-2 font-mono">
              <Trash2 className="h-4 w-4 text-accent-rose animate-pulse" />
              Danger Zone
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => dispatch(resetRagSettings())}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold bg-surface-2 border border-border-hairline text-text-primary hover:bg-surface-3 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset Defaults
              </button>

              <button
                onClick={handleWipeHistory}
                disabled={clearHistoryMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold bg-accent-rose/10 border border-accent-rose/25 text-accent-rose hover:bg-accent-rose/20 transition-all disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Chat History
              </button>
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
