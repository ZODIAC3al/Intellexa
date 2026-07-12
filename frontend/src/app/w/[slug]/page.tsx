'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, API_BASE } from '@/utils/api';
import Logo from '@/components/ui/Logo';
import { Send, Globe, Loader2, Sparkles, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function PublicWorkspaceSharePage() {
  const { slug } = useParams() as { slug: string };
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: publicWorkspace, isLoading, error } = useQuery({
    queryKey: ['publicWorkspace', slug],
    queryFn: () => api.getPublicWorkspace(slug),
    retry: false,
  });

  useEffect(() => {
    if (publicWorkspace?.collections?.length > 0) {
      setSelectedCollectionId(publicWorkspace.collections[0].id);
    }
  }, [publicWorkspace]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isGenerating, scrollToBottom]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-100">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    );
  }

  if (error || !publicWorkspace) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-base-100 gap-4">
        <Logo size="lg" />
        <div className="text-center">
          <h2 className="text-lg font-bold text-base-content">Public share page not found</h2>
          <p className="text-xs text-neutral-content mt-1">This workspace is either private or does not exist.</p>
        </div>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !selectedCollectionId || isGenerating) return;

    const userMessage = { role: 'user', content: question, timestamp: Date.now() };
    setChatMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setIsGenerating(true);

    const assistantMsgId = `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const initialAssistantMsg = { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() };
    setChatMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      const response = await fetch(`${API_BASE}/public/w/${slug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.content, collectionId: selectedCollectionId }),
      });

      if (!response.ok) throw new Error('API server returned error');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.substring(6));
              if (event.type === 'token') {
                setChatMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: msg.content + event.data }
                      : msg
                  )
                );
              }
            } catch (err) {
              // Ignore partial chunk parse error
            }
          }
        }
      }
    } catch (err) {
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: '⚠️ An error occurred or this public portal is rate-limited.' }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-base-100 text-base-content overflow-hidden font-sans">
      {/* Mini header */}
      <header className="navbar bg-base-200 border-b border-neutral px-6 min-h-[56px] shrink-0 justify-between items-center gap-4">
        <Logo size="md" />
        <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 animate-pulse" /> Public Research Portal
        </span>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-w-0 h-full overflow-hidden">
        {/* Left Side: Info panel */}
        <div className="w-full md:w-80 bg-base-200 border-r border-neutral p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase">Workspace</span>
            <h1 className="text-lg font-black text-base-content mt-1 leading-tight">{publicWorkspace.workspaceName}</h1>
            <p className="text-xs text-neutral-content mt-2 leading-relaxed">
              You are querying the public knowledge files of this workspace anonymously.
            </p>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-xs font-bold text-neutral-content">Target Collection</span>
            </label>
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="select select-bordered select-sm w-full text-xs font-semibold"
            >
              {publicWorkspace.collections?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="card bg-base-300 border border-neutral p-4 flex flex-col gap-2">
            <h3 className="font-bold text-xs text-base-content flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Active Collection Info
            </h3>
            <p className="text-[11px] text-neutral-content leading-relaxed">
              {publicWorkspace.collections?.find((c: any) => c.id === selectedCollectionId)?.description ||
                'No description provided.'}
            </p>
          </div>
        </div>

        {/* Right Side: Chat Sandbox */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-base-100">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scrollbar-thin flex flex-col gap-6">
            {chatMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto">
                <div className="p-3.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-base-content">Ask this knowledge base anything</h3>
                  <p className="text-xs text-neutral-content mt-1.5 leading-relaxed">
                    Submit questions related to the active collection. Responses are generated locally via the workspace's privacy-preserving AI.
                  </p>
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
                  <div className={`chat-bubble max-w-[85%] text-xs leading-relaxed ${
                    msg.role === 'user' ? 'chat-bubble-primary' : 'bg-base-200 border border-neutral text-base-content'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          pre: ({ node, ...props }) => (
                            <pre className="p-3 bg-base-300 rounded-md overflow-x-auto text-[10px] font-mono border border-neutral mt-2" {...props} />
                          ),
                          code: ({ node, ...props }) => (
                            <code className="px-1 py-0.5 bg-base-300 rounded font-mono text-[10px]" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))
            )}

            {isGenerating && (
              <div className="chat chat-start">
                <div className="chat-bubble bg-base-200 border border-neutral p-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs font-medium text-neutral-content">Querying vectors...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-neutral bg-base-200/50 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about the files..."
              className="input input-bordered input-sm flex-1 text-xs"
              required
              disabled={isGenerating}
            />
            <button type="submit" className="btn btn-primary btn-sm flex items-center gap-1" disabled={isGenerating}>
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
