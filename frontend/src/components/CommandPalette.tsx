'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { setView, toggleSidebar, setTheme } from '../redux/slices/uiSlice';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  Cloud,
  FileText,
  Layers,
  Settings as SettingsIcon,
  LayoutDashboard,
  Terminal,
  Moon,
  Sun,
  PlusCircle,
  HelpCircle,
  Hash,
  X,
  ScanSearch,
} from 'lucide-react';
import { DocumentInfo, Collection } from '../../../shared/types';

export default function CommandPalette() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeView = useSelector((state: RootState) => state.ui.activeView);
  const theme = useSelector((state: RootState) => state.ui.theme);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch Documents and Collections for live search
  const { data: documents = [] } = useQuery<DocumentInfo[]>({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
    enabled: isOpen,
  });

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: api.getCollections,
    enabled: isOpen,
  });

  // Global key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const toggleTheme = () => {
    const nextTheme = theme === 'intellexa-dark' ? 'intellexa-light' : 'intellexa-dark';
    dispatch(setTheme(nextTheme));
  };

  // Build commands list
  const baseCommands = [
    {
      id: 'nav-dash',
      title: 'Go to Dashboard',
      subtitle: 'Overview, database stats, and analytics',
      icon: <LayoutDashboard className="h-4 w-4" />,
      action: () => dispatch(setView('dashboard')),
      category: 'Navigation',
    },
    {
      id: 'nav-local',
      title: 'Go to Local RAG Assistant',
      subtitle: 'Privacy-first offline document chat',
      icon: <BookOpen className="h-4 w-4" />,
      action: () => dispatch(setView('local')),
      category: 'Navigation',
    },
    {
      id: 'nav-cloud',
      title: 'Go to Cloud AI Assistant',
      subtitle: 'Talk to Hugging Face and generate images',
      icon: <Cloud className="h-4 w-4" />,
      action: () => dispatch(setView('cloud')),
      category: 'Navigation',
    },
    {
      id: 'nav-docs',
      title: 'Go to Document Hub',
      subtitle: 'Index, chunk, and embed source references',
      icon: <FileText className="h-4 w-4" />,
      action: () => dispatch(setView('documents')),
      category: 'Navigation',
    },
    {
      id: 'nav-collections',
      title: 'Go to Collections Manager',
      subtitle: 'Group related papers into isolated databases',
      icon: <Layers className="h-4 w-4" />,
      action: () => dispatch(setView('collections')),
      category: 'Navigation',
    },
    {
      id: 'nav-search',
      title: 'Go to Global Search',
      subtitle: 'Search across all indexed documents',
      icon: <ScanSearch className="h-4 w-4" />,
      action: () => dispatch(setView('search')),
      category: 'Navigation',
    },
    {
      id: 'nav-settings',
      title: 'Go to System Settings',
      subtitle: 'Adjust local models, chunking, and theme',
      icon: <SettingsIcon className="h-4 w-4" />,
      action: () => dispatch(setView('settings')),
      category: 'Navigation',
    },
    {
      id: 'action-theme',
      title: 'Toggle Color Theme',
      subtitle: `Switch current theme to ${theme === 'intellexa-dark' ? 'Light' : 'Dark'} mode`,
      icon: theme === 'intellexa-dark' ? <Sun className="h-4 w-4 text-accent-amber" /> : <Moon className="h-4 w-4 text-accent-violet" />,
      action: toggleTheme,
      category: 'System',
    },
    {
      id: 'action-new-chat',
      title: 'New Conversation Session',
      subtitle: 'Clear screen and start fresh chat context',
      icon: <PlusCircle className="h-4 w-4" />,
      action: () => {
        dispatch({ type: 'ui/setActiveConversationId', payload: null });
      },
      category: 'Actions',
    },
  ];

  // Dynamic searches
  const filteredDocs = query
    ? documents
        .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
        .map((d) => ({
          id: `doc-${d.id}`,
          title: d.name,
          subtitle: `Document · ${d.chunksCount} chunks`,
          icon: <FileText className="h-4 w-4 text-accent-cyan" />,
          action: () => {
            dispatch({ type: 'ui/setActiveDocumentId', payload: d.id });
            dispatch(setView('local'));
          },
          category: 'Documents',
        }))
    : [];

  const filteredCols = query
    ? collections
        .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
        .map((c) => ({
          id: `col-${c.id}`,
          title: c.name,
          subtitle: `Collection · ${c.documentIds.length} files linked`,
          icon: <Layers className="h-4 w-4 text-accent-violet" />,
          action: () => {
            dispatch({ type: 'ui/setActiveCollectionId', payload: c.id });
            dispatch(setView('local'));
          },
          category: 'Collections',
        }))
    : [];

  const filteredBase = baseCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [...filteredBase, ...filteredCols, ...filteredDocs];

  // Key navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
        setIsOpen(false);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (listEl) {
      const activeEl = listEl.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <>
      {/* Keyboard guide strip inside footer/sidebar */}
      <div
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-hairline bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text-primary text-[10px] font-mono cursor-pointer shadow-lg select-none transition-all duration-200"
      >
        <span>Press</span>
        <kbd className="px-1 py-0.5 rounded bg-surface-2 border border-border-hairline">Ctrl</kbd>
        <span>+</span>
        <kbd className="px-1 py-0.5 rounded bg-surface-2 border border-border-hairline">K</kbd>
        <span>for Command Palette</span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 font-sans select-none">
            {/* Backdrop Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -20, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="relative w-full max-w-xl rounded-xl border border-border-hairline bg-surface-1 shadow-2xl overflow-hidden flex flex-col max-h-[420px]"
            >
              {/* Input header */}
              <div className="flex items-center gap-3 px-4 border-b border-border-hairline shrink-0 bg-surface-2">
                <Search className="h-4 w-4 text-text-muted shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a command or search database items..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-none focus:outline-none text-xs text-text-primary placeholder-text-muted py-4 font-sans"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-surface-1 text-text-muted hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Items List */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto p-2 scrollbar-thin space-y-1 bg-surface-1"
              >
                {allItems.length === 0 ? (
                  <div className="text-center py-10 text-xs text-text-muted font-mono">
                    No matching commands found.
                  </div>
                ) : (
                  (() => {
                    let currentCategory = '';
                    return allItems.map((item, idx) => {
                      const showHeader = item.category !== currentCategory;
                      currentCategory = item.category;

                      return (
                        <div key={item.id}>
                          {showHeader && (
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono px-3.5 py-1.5 mt-2 mb-1">
                              {item.category}
                            </div>
                          )}
                          <button
                            data-index={idx}
                            onClick={() => {
                              item.action();
                              setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                              selectedIndex === idx
                                ? 'bg-accent-violet-soft border-l-2 border-accent-violet text-text-primary'
                                : 'bg-transparent text-text-muted hover:bg-surface-2/65 hover:text-text-primary'
                            }`}
                          >
                            <div className={`h-7 w-7 rounded flex items-center justify-center border shrink-0 ${
                              selectedIndex === idx
                                ? 'bg-surface-1 border-accent-violet/20 text-accent-violet'
                                : 'bg-surface-2 border-border-hairline text-text-muted'
                            }`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold block text-text-primary">{item.title}</span>
                              <span className="text-[10px] text-text-muted block truncate font-sans">{item.subtitle}</span>
                            </div>
                          </button>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Footer info bar */}
              <div className="px-4 py-2 border-t border-border-hairline bg-surface-2 shrink-0 flex justify-between items-center text-[9px] font-mono text-text-muted">
                <div className="flex gap-2.5">
                  <span>↑↓ to navigate</span>
                  <span>↵ to select</span>
                </div>
                <span>ESC to exit</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
