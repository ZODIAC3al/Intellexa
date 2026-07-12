'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import {
  setView,
  setActiveConversationId,
  toggleSidebar,
  toggleTheme,
  setSidebarOpen,
} from '../redux/slices/uiSlice';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  LayoutDashboard,
  Cloud,
  BookOpen,
  Files,
  FolderHeart,
  Settings as SettingsIcon,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Pin,
  Star,
  Trash2,
  Edit3,
  Plus,
  Loader,
  Sun,
  Moon,
  ScanSearch,
  User,
} from 'lucide-react';
import { Conversation } from '../../../shared/types';

const IntellexaLogo = ({ theme, collapsed }: { theme: string; collapsed: boolean }) => (
  <div className="flex items-center gap-2 select-none overflow-hidden shrink-0">
    <svg viewBox="0 0 110 100" className="h-7 w-9 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 35,25 C 25,45 25,55 35,75" stroke="#6E5BFF" strokeWidth="8" strokeLinecap="round" />
      <path d="M 35,75 C 50,85 60,85 75,75" stroke="#33D6C0" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 75,75 C 70,55 65,50 60,50" stroke="#33D6C0" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 35,25 C 45,25 50,40 60,50" stroke="#6E5BFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 60,50 C 65,40 70,25 75,25" stroke="#F2B84B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 35,75 C 45,65 50,55 60,50" stroke="#FF6B7A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="35" cy="25" r="9" fill="#6E5BFF" />
      <circle cx="35" cy="75" r="9" fill="#FF6B7A" />
      <circle cx="60" cy="50" r="9" fill="#FF6B7A" />
      <circle cx="75" cy="25" r="9" fill="#F2B84B" />
      <circle cx="75" cy="75" r="9" fill="#33D6C0" />
    </svg>
    {!collapsed && (
      <motion.div 
        initial={{ opacity: 0, x: -10 }} 
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col"
      >
        <span className="font-sans font-black text-sm tracking-wider leading-none text-text-primary">
          INTELLEXA
        </span>
        <span className="text-[7px] font-mono tracking-tighter uppercase mt-1 leading-none text-text-muted whitespace-nowrap">
          ai workbench
        </span>
      </motion.div>
    )}
  </div>
);

export default function Sidebar() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const activeView = useSelector((state: RootState) => state.ui.activeView);
  const activeConversationId = useSelector((state: RootState) => state.ui.activeConversationId);
  const isSidebarOpen = useSelector((state: RootState) => state.ui.isSidebarOpen);
  const theme = useSelector((state: RootState) => state.ui.theme);

  const [isClient, setIsClient] = React.useState(false);
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (!initializedRef.current && typeof window !== 'undefined') {
      initializedRef.current = true;
      setIsClient(true);
      if (window.innerWidth >= 1024) {
        dispatch(setSidebarOpen(true));
      }
    }
  }, [dispatch]);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['history'],
    queryFn: api.getHistory,
    refetchInterval: 12000,
    enabled: isClient,
  });

  const createChatMutation = useMutation({
    mutationFn: ({ mode, title }: { mode: 'cloud' | 'local'; title?: string }) =>
      api.createConversation(mode, title),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      dispatch(setActiveConversationId(newChat.id));
      dispatch(setView(newChat.mode === 'cloud' ? 'cloud' : 'local'));
      toast.success(`${newChat.mode === 'cloud' ? 'Cloud' : 'Local'} chat created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create chat: ${error.message}`);
    },
  });

  const updateChatMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Conversation, 'title' | 'isFavorite' | 'isPinned'>> }) =>
      api.updateConversation(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      toast.success('Chat updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update chat: ${error.message}`);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: api.deleteConversation,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      if (activeConversationId === deletedId) {
        dispatch(setActiveConversationId(null));
      }
      toast.success('Chat deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete chat: ${error.message}`);
    },
  });

  const startEditing = (chat: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const saveEdit = (id: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      updateChatMutation.mutate({ id, updates: { title: editTitle.trim() } });
    }
    setEditingChatId(null);
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editTitle.trim()) {
        updateChatMutation.mutate({ id, updates: { title: editTitle.trim() } });
      }
      setEditingChatId(null);
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
    }
  };

  const toggleFavorite = (chat: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    updateChatMutation.mutate({ id: chat.id, updates: { isFavorite: !chat.isFavorite } });
  };

  const togglePin = (chat: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    updateChatMutation.mutate({ id: chat.id, updates: { isPinned: !chat.isPinned } });
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      deleteChatMutation.mutate(id);
    }
  };

  const handleCreateNewChat = (mode: 'cloud' | 'local') => {
    createChatMutation.mutate({ mode, title: 'New Conversation' });
  };

  const scrollToTop = () => {
    const main = document.getElementById('dashboard-main');
    if (main) {
      const scrollable = main.querySelector('.overflow-y-auto') as HTMLElement;
      if (scrollable) scrollable.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleViewChange = (view: string) => {
    dispatch(setView(view as any));
    dispatch(setActiveConversationId(null));
    scrollToTop();
  };

  const filteredChats = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter((c) => c.isPinned);
  const unpinnedChats = filteredChats.filter((c) => !c.isPinned);

  const menuItems = [
    { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'cloud', label: 'Cloud Assistant', icon: Cloud },
    { view: 'local', label: 'Research Assistant', icon: BookOpen },
    { view: 'documents', label: 'Documents', icon: Files },
    { view: 'collections', label: 'Collections', icon: FolderHeart },
    { view: 'search', label: 'Global Search', icon: ScanSearch },
    { view: 'profile', label: 'Profile', icon: User },
    { view: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const;

  return (
    <>
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-border-hairline bg-surface-1 text-text-primary shrink-0 z-40">
        <IntellexaLogo theme={theme} collapsed={false} />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => dispatch(toggleTheme())}
            className={`p-2 rounded-lg transition-all ${theme === 'intellexa-dark' ? 'text-accent-amber hover:bg-surface-2' : 'text-accent-violet hover:bg-surface-2'}`}
            title="Toggle theme"
          >
            {theme === 'intellexa-dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-primary"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <motion.div
        animate={{ width: isSidebarOpen ? 240 : 68 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`hidden lg:flex flex-col border-r border-border-hairline bg-surface-1 p-3 shrink-0 h-screen overflow-hidden relative group/sidebar`}
      >
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="absolute right-3 top-4 z-50 p-1.5 rounded-lg border border-border-hairline bg-surface-2 hover:bg-surface-1 text-text-muted hover:text-text-primary transition-all shadow-sm opacity-0 group-hover/sidebar:opacity-100 duration-200"
          title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isSidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <div className="flex items-center justify-between mb-6 pr-6 pt-1">
          <IntellexaLogo theme={theme} collapsed={!isSidebarOpen} />
        </div>

        <nav className="space-y-1 mb-5">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeView === item.view && !activeConversationId;
            return (
              <button
                key={item.view}
                onClick={() => handleViewChange(item.view)}
                className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-200 group relative ${
                  isSidebarOpen ? 'px-3 py-2 gap-3' : 'p-2.5 justify-center'
                } ${
                  isActive
                    ? 'bg-primary/15 text-primary font-semibold border-l-2 border-primary pl-2.5'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-2 border-l-2 border-transparent'
                }`}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <IconComponent className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'
                }`} />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {isSidebarOpen ? (
          <div className="flex gap-2 mb-4 shrink-0">
            <button
              onClick={() => handleCreateNewChat('cloud')}
              disabled={createChatMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-content shadow-sm shadow-primary/10 disabled:opacity-50"
            >
              {createChatMutation.isPending && createChatMutation.variables?.mode === 'cloud' ? (
                <Loader className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Cloud Chat
            </button>
            <button
              onClick={() => handleCreateNewChat('local')}
              disabled={createChatMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-semibold border border-border-hairline bg-surface-2 text-text-primary hover:bg-surface-1 disabled:opacity-50"
            >
              {createChatMutation.isPending && createChatMutation.variables?.mode === 'local' ? (
                <Loader className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Local RAG
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4 shrink-0 items-center">
            <button
              onClick={() => handleCreateNewChat('cloud')}
              disabled={createChatMutation.isPending}
              className="p-2 rounded-lg bg-primary text-primary-content hover:bg-primary/90 transition-all shadow-sm"
              title="New Cloud Chat"
            >
              <Cloud className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleCreateNewChat('local')}
              disabled={createChatMutation.isPending}
              className="p-2 rounded-lg border border-border-hairline bg-surface-2 text-text-primary hover:bg-surface-1 transition-all"
              title="New Local RAG"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isSidebarOpen && (
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-border-hairline rounded-lg py-1.5 pl-8 pr-3 text-[11px] placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary bg-surface-2 text-text-primary transition-all"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin overflow-x-hidden">
          {isLoading ? (
            <div className="flex justify-center py-6 text-text-muted">
              <Loader className="h-4 w-4 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            isSidebarOpen && <div className="text-center py-6 text-[10px] text-text-muted font-mono">No history</div>
          ) : (
            <>
              {pinnedChats.length > 0 && (
                <div className="space-y-1">
                  {isSidebarOpen && (
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-2 mb-1">
                      Pinned
                    </div>
                  )}
                  {pinnedChats.map((chat) => renderChatRow(chat))}
                </div>
              )}

              <div className="space-y-1">
                {isSidebarOpen && pinnedChats.length > 0 && unpinnedChats.length > 0 && (
                  <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-2 mt-3 mb-1">
                    History
                  </div>
                )}
                {unpinnedChats.map((chat) => renderChatRow(chat))}
              </div>
            </>
          )}
        </div>

        {isSidebarOpen && (
          <div className="pt-2 border-t border-border-hairline flex items-center justify-between shrink-0">
            <span className="text-[9px] font-mono text-text-muted">v1.0.0</span>
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all"
            >
              {theme === 'intellexa-dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch(toggleSidebar())}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-72 bg-surface-1 border-r border-border-hairline p-4 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-5">
                <IntellexaLogo theme={theme} collapsed={false} />
                <button
                  onClick={() => dispatch(toggleSidebar())}
                  className="p-1.5 rounded-lg hover:bg-surface-2 text-text-primary"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1 mb-5">
                {menuItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeView === item.view && !activeConversationId;
                  return (
                    <button
                      key={item.view}
                      onClick={() => {
                        handleViewChange(item.view);
                        dispatch(toggleSidebar());
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary/15 text-primary font-semibold border-l-2 border-primary pl-2.5'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-2'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 shrink-0 text-current" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { handleCreateNewChat('cloud'); dispatch(toggleSidebar()); }}
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-primary text-primary-content hover:bg-primary/90"
                >
                  Cloud Chat
                </button>
                <button
                  onClick={() => { handleCreateNewChat('local'); dispatch(toggleSidebar()); }}
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border border-border-hairline bg-surface-2 text-text-primary hover:bg-surface-1"
                >
                  Local RAG
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {conversations.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      dispatch(setActiveConversationId(chat.id));
                      dispatch(setView(chat.mode === 'cloud' ? 'cloud' : 'local'));
                      dispatch(toggleSidebar());
                    }}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs border border-transparent ${
                      activeConversationId === chat.id
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'text-text-muted hover:bg-surface-2'
                    }`}
                  >
                    {chat.mode === 'cloud' ? <Cloud className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
                    <span className="truncate">{chat.title}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  function renderChatRow(chat: Conversation) {
    const isSelected = activeConversationId === chat.id;
    const isEditing = editingChatId === chat.id;

    return (
      <div
        key={chat.id}
        onClick={() => {
          dispatch(setActiveConversationId(chat.id));
          dispatch(setView(chat.mode === 'cloud' ? 'cloud' : 'local'));
        }}
        className={`group flex items-center justify-between rounded-lg text-[11px] cursor-pointer border border-transparent transition-all ${
          isSidebarOpen ? 'px-3 py-1.5' : 'p-2 justify-center'
        } ${
          isSelected
            ? 'bg-surface-2 border-border-hairline text-text-primary font-semibold'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-2/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {chat.mode === 'cloud' ? (
            <Cloud className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-accent-amber' : 'text-text-muted'}`} />
          ) : (
            <BookOpen className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-accent-cyan' : 'text-text-muted'}`} />
          )}

          {isSidebarOpen && (
            isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={(e) => saveEdit(chat.id, e)}
                onKeyDown={(e) => handleKeyDown(chat.id, e)}
                onClick={(e) => e.stopPropagation()}
                className="w-full border border-primary/50 rounded px-1 py-0.5 text-[10px] focus:outline-none bg-surface-0 text-text-primary"
                autoFocus
              />
            ) : (
              <span className="truncate pr-1 select-none">{chat.title}</span>
            )
          )}
        </div>

        {isSidebarOpen && !isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => togglePin(chat, e)}
              className={`p-1 rounded hover:bg-surface-1 text-text-muted hover:text-text-primary ${chat.isPinned ? 'text-primary' : ''}`}
              title="Pin chat"
            >
              <Pin className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={(e) => toggleFavorite(chat, e)}
              className={`p-1 rounded hover:bg-surface-1 text-text-muted hover:text-text-primary ${chat.isFavorite ? 'text-accent-amber' : ''}`}
              title="Favorite"
            >
              <Star className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={(e) => startEditing(chat, e)}
              className="p-1 rounded hover:bg-surface-1 text-text-muted hover:text-text-primary"
              title="Rename"
            >
              <Edit3 className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={(e) => deleteChat(chat.id, e)}
              className="p-1 rounded hover:bg-surface-1 text-text-muted hover:text-accent-rose"
              title="Delete"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>
    );
  }
}