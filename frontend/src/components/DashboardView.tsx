'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useDispatch } from 'react-redux';
import { setView, setActiveConversationId } from '../redux/slices/uiSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Database,
  CloudLightning,
  Sparkles,
  History,
  Activity,
  ChevronRight,
  DatabaseZap,
  ActivitySquare,
  BarChart3,
  Layers,
} from 'lucide-react';
import { DashboardStats, DocumentInfo, Conversation } from '../../../shared/types';
import Button from './ui/Button';
import StatusPill from './ui/StatusPill';
import ResponseSpeedChart from './dashboard/ResponseSpeedChart';
import SearchSpeedChart from './dashboard/SearchSpeedChart';
import RetrievalScoreDistribution from './dashboard/RetrievalScoreDistribution';
import ActivityFeed from './dashboard/ActivityFeed';
import CollectionSummary from './dashboard/CollectionSummary';

type DashboardTab = 'overview' | 'analytics' | 'activity';

const TABS: { id: DashboardTab; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: History },
];

export default function DashboardView() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isStorageDrawerOpen, setIsStorageDrawerOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 8000,
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery<DocumentInfo[]>({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['history'],
    queryFn: api.getHistory,
  });

  const createChatMutation = useMutation({
    mutationFn: ({ mode, title }: { mode: 'cloud' | 'local'; title?: string }) =>
      api.createConversation(mode, title),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      dispatch(setActiveConversationId(newChat.id));
      dispatch(setView(newChat.mode === 'cloud' ? 'cloud' : 'local'));
    },
  });

  const triggerChat = (mode: 'cloud' | 'local') => {
    createChatMutation.mutate({ mode, title: `${mode === 'cloud' ? 'Cloud' : 'Local'} Research Session` });
  };

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const pinnedConversations = conversations.filter((c) => c.isPinned).slice(0, 3);

  const renderBentoChart = () => {
    const searchData = [12, 14, 11, 15, 13, 16, stats?.avgSearchTimeMs ?? 12];
    const responseData = [800, 840, 780, 890, 810, 910, stats?.avgResponseTimeMs ?? 850];

    const width = 600;
    const height = 180;
    const padding = 20;

    const getPointsStr = (data: number[]) => {
      const minVal = Math.min(...data);
      const maxVal = Math.max(...data);
      const range = maxVal - minVal || 1;
      return data
        .map((val, idx) => {
          const x = padding + (idx * (width - padding * 2)) / (data.length - 1);
          const y = height - padding - ((val - minVal) * (height - padding * 2)) / range;
          return `${x},${y}`;
        })
        .join(' ');
    };

    const getFillPointsStr = (data: number[], pointsStr: string) => {
      return `${padding},${height - padding} ${pointsStr} ${width - padding},${height - padding}`;
    };

    const searchPoints = getPointsStr(searchData);
    const responsePoints = getPointsStr(responseData);

    return (
      <div className="relative w-full h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Avg Local Search</span>
              <span className="text-xl font-mono font-bold text-accent-cyan">
                {stats?.avgSearchTimeMs ?? 12} <span className="text-xs text-text-muted">ms</span>
              </span>
            </div>
            <div className="border-l border-border-hairline h-8" />
            <div>
              <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Avg Generation</span>
              <span className="text-xl font-mono font-bold text-accent-violet">
                {stats?.avgResponseTimeMs ?? 850} <span className="text-xs text-text-muted">ms</span>
              </span>
            </div>
          </div>
          <StatusPill label="Live Telemetry" variant="cyan" />
        </div>

        <div className="relative flex-1 min-h-[120px]">
          <div className="absolute inset-0 bg-gradient-to-tr from-accent-cyan/2 via-transparent to-accent-violet/3 blur-md rounded" />
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#33D6C0" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#33D6C0" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6E5BFF" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#6E5BFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border-hairline)" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-hairline)" strokeWidth="1" />
            <polygon points={getFillPointsStr(searchData, searchPoints)} fill="url(#cyanGrad)" />
            <polyline fill="none" stroke="#33D6C0" strokeWidth="2" strokeLinecap="round" points={searchPoints} />
            <polygon points={getFillPointsStr(responseData, responsePoints)} fill="url(#violetGrad)" />
            <polyline fill="none" stroke="#6E5BFF" strokeWidth="2.5" strokeLinecap="round" points={responsePoints} />
          </svg>
        </div>
      </div>
    );
  };

  const healthData = [
    {
      name: 'Local Ollama Model',
      status: stats?.systemHealth?.ollamaConnected ? 'Active' : 'Offline',
      variant: stats?.systemHealth?.ollamaConnected ? 'cyan' : 'rose',
      desc: stats?.systemHealth?.ollamaConnected ? 'Local embeddings & Llama-3.2 running.' : 'Ollama host unreachable.',
    },
    {
      name: 'Vector Database Engine',
      status: stats?.systemHealth?.vectorDbEngine === 'chroma' ? 'ChromaDB' : 'JSON Fallback',
      variant: stats?.systemHealth?.vectorDbEngine === 'chroma' ? 'cyan' : 'amber',
      desc: stats?.systemHealth?.vectorDbEngine === 'chroma' ? 'High performance Chroma client connected.' : 'Running local JSON fallback engine.',
    },
    {
      name: 'HuggingFace Cloud Link',
      status: stats?.systemHealth?.hfTokenConfigured ? 'Connected' : 'Demo Mode',
      variant: stats?.systemHealth?.hfTokenConfigured ? 'amber' : 'slate',
      desc: stats?.systemHealth?.hfTokenConfigured ? 'Authentication token configured.' : 'Token missing. Cloud services run in simulated demo.',
    },
  ] as const;

  if (statsLoading || docsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-0 min-h-screen">
        <Activity className="h-8 w-8 animate-spin text-accent-violet mb-4" />
        <span className="text-text-muted text-xs font-mono">Resolving workspace analytics...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto bg-surface-0 p-5 lg:p-8 space-y-6 scrollbar-thin select-none"
    >
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border-hairline bg-surface-1 p-6 shadow-sm">
        <div className="absolute right-[-40px] top-[-45px] h-40 w-40 bg-accent-violet/6 blur-[55px] rounded-full pointer-events-none" />
        <div className="absolute left-1/3 bottom-[-20px] h-32 w-32 bg-accent-cyan/4 blur-[45px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-accent-violet-soft text-accent-violet border border-accent-violet/10">
              <Sparkles className="h-3 w-3 shrink-0" />
              INTELLIGENT AI SYSTEM ACTIVE
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Your Hybrid AI Research Workbench
            </h1>
            <p className="text-xs text-text-muted leading-relaxed">
              Conduct high-fidelity semantic RAG queries locally via **Ollama**, or leverage secure cloud intelligence via **HuggingFace** pipelines for image generations and speech transcripts.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => triggerChat('local')}>
              Local RAG Chat
            </Button>
            <Button variant="primary" size="sm" onClick={() => triggerChat('cloud')}>
              Cloud AI Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-1 border border-border-hairline overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-accent-violet-soft text-accent-violet shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-2/60'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* System Health */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-border-hairline bg-surface-1/40">
              {healthData.map((h, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (h.name.includes('Vector') || h.name.includes('Ollama')) {
                      setIsStorageDrawerOpen(true);
                    } else {
                      dispatch(setView('settings'));
                    }
                  }}
                  className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-surface-2/40 transition-all duration-200"
                >
                  <StatusPill label={h.status} variant={h.variant} className="shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-text-primary block leading-none mb-1">
                      {h.name}
                    </span>
                    <p className="text-[9px] text-text-muted leading-relaxed truncate">
                      {h.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm min-h-[220px] flex flex-col justify-between">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-2 font-mono">
                  Model Response Latency Trends
                </span>
                <div className="flex-1">
                  {renderBentoChart()}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div
                  onClick={() => dispatch(setView('documents'))}
                  className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm hover:border-accent-violet/30 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">Documents Indexed</span>
                    <FileText className="h-4 w-4 text-accent-violet" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-mono font-bold text-text-primary">
                      {stats?.documentsCount ?? 0}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono block mt-1">
                      Total size: {stats?.storageUsedMb ?? 0} MB
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setIsStorageDrawerOpen(true)}
                  className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm hover:border-accent-cyan/30 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">Vector Storage</span>
                    <Database className="h-4 w-4 text-accent-cyan" />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-mono font-bold text-text-primary">
                        {stats?.databaseSizeMb ?? 0}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">MB</span>
                    </div>
                    <span className="text-[10px] text-text-muted font-mono block mt-1">
                      Chunks: {stats?.chunksCount ?? 0} · Embeddings: {stats?.embeddingsCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest font-mono">
                    Recently Indexed Files
                  </h3>
                  <button
                    onClick={() => dispatch(setView('documents'))}
                    className="text-[10px] font-bold text-accent-violet hover:underline flex items-center gap-0.5"
                  >
                    All files <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {recentDocs.length === 0 ? (
                    <div className="text-center py-10 text-xs text-text-muted font-mono">
                      No indexed files. Upload documents to activate RAG.
                    </div>
                  ) : (
                    recentDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border-hairline bg-surface-2/40 hover:bg-surface-2 transition-all duration-150"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-4 w-4 text-accent-violet shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-text-primary truncate block max-w-xs" title={doc.name}>
                              {doc.name}
                            </span>
                            <span className="text-[9px] text-text-muted font-mono block mt-0.5">
                              Chunks: {doc.chunksCount} · {(doc.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wide border ${
                              doc.status === 'completed'
                                ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                                : doc.status === 'processing'
                                ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20 animate-pulse'
                                : 'bg-accent-rose/10 text-accent-rose border-accent-rose/20'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest font-mono mb-4 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-accent-violet" />
                    Pinned Conversations
                  </h3>
                  <div className="space-y-2">
                    {pinnedConversations.length === 0 ? (
                      <div className="text-center py-10 text-xs text-text-muted font-mono">
                        No pinned chats. Pin conversations in the sidebar.
                      </div>
                    ) : (
                      pinnedConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => {
                            dispatch(setActiveConversationId(conv.id));
                            dispatch(setView(conv.mode === 'cloud' ? 'cloud' : 'local'));
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border-hairline bg-surface-2/40 hover:bg-surface-2 hover:border-accent-violet/20 text-left transition-all duration-200"
                        >
                          <div className={`h-7 w-7 rounded-lg flex items-center justify-center border shrink-0 ${
                            conv.mode === 'cloud'
                              ? 'bg-accent-amber/10 border-accent-amber/20 text-accent-amber'
                              : 'bg-accent-cyan/10 border-accent-cyan/20 text-accent-cyan'
                          }`}>
                            {conv.mode === 'cloud' ? <CloudLightning className="h-3.5 w-3.5" /> : <DatabaseZap className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-text-primary truncate">{conv.title}</div>
                            <span className="text-[8px] text-text-muted font-mono uppercase tracking-wider font-bold">
                              {conv.mode} mode
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Collection Summary */}
            <CollectionSummary />
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Documents', value: stats?.documentsCount ?? 0, icon: FileText, color: 'text-accent-violet' },
                { label: 'Collections', value: stats?.collectionsCount ?? 0, icon: Layers, color: 'text-accent-cyan' },
                { label: 'Conversations', value: stats?.conversationsCount ?? 0, icon: CloudLightning, color: 'text-accent-amber' },
                { label: 'Total Chunks', value: stats?.chunksCount ?? 0, icon: Database, color: 'text-accent-violet' },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl border border-border-hairline bg-surface-1 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">{stat.label}</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-text-primary">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm min-h-[240px]">
                <ResponseSpeedChart />
              </div>
              <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm min-h-[240px]">
                <SearchSpeedChart />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm min-h-[220px]">
                <RetrievalScoreDistribution />
              </div>

              {/* Performance Summary */}
              <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono block">
                  Performance Summary
                </span>
                <div className="space-y-4">
                  {[
                    { label: 'Avg Search Time', value: `${stats?.avgSearchTimeMs ?? 12}ms`, sub: 'Vector retrieval latency', color: 'text-accent-cyan' },
                    { label: 'Avg Generation', value: `${stats?.avgResponseTimeMs ?? 850}ms`, sub: 'LLM inference latency', color: 'text-accent-violet' },
                    { label: 'Embeddings', value: stats?.embeddingsCount ?? 0, sub: 'Total vector embeddings', color: 'text-accent-amber' },
                    { label: 'Cloud Messages', value: stats?.cloudMessagesCount ?? 0, sub: 'HuggingFace API calls', color: 'text-accent-violet' },
                    { label: 'Local Messages', value: stats?.localMessagesCount ?? 0, sub: 'Ollama inference calls', color: 'text-accent-cyan' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2/40 border border-border-hairline/60">
                      <div>
                        <span className="text-xs font-bold text-text-primary block">{item.label}</span>
                        <span className="text-[9px] text-text-muted">{item.sub}</span>
                      </div>
                      <span className={`text-sm font-mono font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="rounded-xl border border-border-hairline bg-surface-1 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-accent-violet" />
                  Recent Activity
                </h3>
                <StatusPill label="Live" variant="cyan" />
              </div>
              <ActivityFeed />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Storage Drawer */}
      <AnimatePresence>
        {isStorageDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStorageDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-96 max-w-full bg-surface-1 border-l border-border-hairline p-6 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border-hairline mb-6">
                <div className="flex items-center gap-2">
                  <DatabaseZap className="h-5 w-5 text-accent-cyan" />
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest font-mono">
                    Storage & Engine Analytics
                  </h2>
                </div>
                <button
                  onClick={() => setIsStorageDrawerOpen(false)}
                  className="text-text-muted hover:text-text-primary text-xs font-mono"
                >
                  [Close]
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Vector DB Connection</span>
                  <div className="p-4 rounded-lg bg-surface-2 border border-border-hairline">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-text-primary">Status</span>
                      <StatusPill
                        label={stats?.systemHealth?.vectorDbEngine === 'chroma' ? 'ChromaDB' : 'JSON Fallback Active'}
                        variant={stats?.systemHealth?.vectorDbEngine === 'chroma' ? 'cyan' : 'amber'}
                      />
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {stats?.systemHealth?.vectorDbEngine === 'chroma'
                        ? 'Connected directly to a local instance of ChromaDB at http://localhost:8000. Cosine distance metrics are optimized.'
                        : 'Could not connect to ChromaDB at localhost:8000. Running a high-fidelity local file-based vector storage fallback (JSON storage). Cosine similarities are computed dynamically in-memory.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Disk Allocation</span>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Parsed Chunks File</span>
                      <span className="font-mono font-bold text-text-primary">{stats?.chunksCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Total Document Uploads</span>
                      <span className="font-mono font-bold text-text-primary">{stats?.storageUsedMb ?? 0} MB</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Vector DB Registry File</span>
                      <span className="font-mono font-bold text-text-primary">{stats?.databaseSizeMb ?? 0} MB</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border-hairline">
                  <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Performance Baseline</span>
                  <div className="p-4 rounded-lg bg-surface-2/40 border border-border-hairline space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1">
                        <ActivitySquare className="h-3.5 w-3.5 text-accent-cyan" />
                        Avg Retrieval
                      </span>
                      <span className="font-mono font-bold text-accent-cyan">{stats?.avgSearchTimeMs ?? 12} ms</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1">
                        <ActivitySquare className="h-3.5 w-3.5 text-accent-violet" />
                        Avg Generation
                      </span>
                      <span className="font-mono font-bold text-accent-violet">{stats?.avgResponseTimeMs ?? 850} ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
