'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { setActiveConversationId, setActiveDocumentId } from '../redux/slices/uiSlice';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, API_BASE } from '../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Send,
  Loader,
  Database,
  ArrowLeft,
  FileText,
  FileSearch,
  ExternalLink,
  Bot,
  User,
  HelpCircle,
  Layers,
  Sliders,
  BadgeAlert,
  Mic,
  MicOff,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
} from 'lucide-react';
import { Conversation, Message, Citation, DocumentInfo, Collection } from '../../../shared/types';
import { speakText, stopSpeaking } from '../utils/speech';
import Button from './ui/Button';

export default function LocalAssistantView() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const activeConversationId = useSelector((state: RootState) => state.ui.activeConversationId);
  const activeDocumentId = useSelector((state: RootState) => state.ui.activeDocumentId);
  const activeCollectionId = useSelector((state: RootState) => state.ui.activeCollectionId);
  const settings = useSelector((state: RootState) => state.rag);

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const [isRAGDebugActive, setIsRAGDebugActive] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [retrievedDebugChunks, setRetrievedDebugChunks] = useState<Citation[]>([]);
  const [excludedChunkIds, setExcludedChunkIds] = useState<string[]>([]);
  const [isDebugViewOpen, setIsDebugViewOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [hoveredCitation, setHoveredCitation] = useState<{
    citation: Citation;
    x: number;
    y: number;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const tempMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const handleToggleSpeak = (message: Message) => {
    if (speakingMessageId === message.id) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      setSpeakingMessageId(message.id);
      speakText(message.content, () => {
        setSpeakingMessageId(null);
      });
    }
  };

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: api.getCollections,
    refetchInterval: 2000,
  });

  const { data: documents = [] } = useQuery<DocumentInfo[]>({
    queryKey: ['documents'],
    queryFn: api.getDocuments,
    refetchInterval: 2000,
  });

  const { data: activeConv } = useQuery<Conversation | undefined>({
    queryKey: ['conversation', activeConversationId],
    queryFn: () => (activeConversationId ? api.getHistory().then((list) => list.find((c) => c.id === activeConversationId)) : Promise.resolve(undefined)),
    enabled: !!activeConversationId,
  });

  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const activeCol = collections.find((c) => c.id === activeCollectionId) || collections[0] || { id: 'default', name: 'General Research', documentIds: [], createdAt: new Date().toISOString() };

  const collectionDocs = documents.filter((d) => activeCol.documentIds.includes(d.id));

  useEffect(() => {
    if (activeConv) {
      setMessages(activeConv.messages);
    } else {
      setMessages([]);
    }
  }, [activeConv]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNear = target.scrollHeight - target.scrollTop - target.clientHeight <= 150;
    isNearBottomRef.current = isNear;
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        stream.getTracks().forEach((track) => track.stop());

        setTranscribing(true);
        try {
          const result = await api.transcribeSpeech(audioBlob);
          setInputMessage((prev) => (prev ? prev + ' ' + result.text : result.text));
        } catch (err: any) {
          console.error('Speech transcription failed:', err);
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Could not access microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRetrieveChunksOnly = async () => {
    if (!inputMessage.trim() || debugLoading) return;
    setDebugLoading(true);
    try {
      const chunks = await api.retrieveLocalChunks(
        inputMessage.trim(),
        activeCol.id,
        settings.topK,
        settings.similarityThreshold,
        settings.retrievalStrategy
      );
      setRetrievedDebugChunks(chunks);
      setExcludedChunkIds([]);
      setIsDebugViewOpen(true);
    } catch (err) {
      console.error('Failed to retrieve chunks:', err);
    } finally {
      setDebugLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, overrideChunksInput?: Citation[]) => {
    e?.preventDefault();
    
    if (isRAGDebugActive && !overrideChunksInput && retrievedDebugChunks.length === 0) {
      await handleRetrieveChunksOnly();
      return;
    }

    const questionText = inputMessage.trim();
    if (!questionText || isGenerating) return;

    isNearBottomRef.current = true;
    setInputMessage('');
    setIsGenerating(false);
    setIsDebugViewOpen(false);

    let activeId = activeConversationId;
    if (!activeId) {
      try {
        const newChat = await api.createConversation('local', questionText.substring(0, 30));
        activeId = newChat.id;
        dispatch(setActiveConversationId(newChat.id));
        queryClient.invalidateQueries({ queryKey: ['history'] });
      } catch (err) {
        console.error('Failed to create new local conversation:', err);
      }
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 11),
      role: 'user',
      content: questionText,
      timestamp: Date.now().toString(),
    };

    const assistantPlaceholder: Message = {
      id: 'assistant_temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      role: 'assistant',
      content: '',
      timestamp: Date.now().toString(),
      citations: [],
    };
    tempMsgIdRef.current = assistantPlaceholder.id;

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsGenerating(true);

    setRetrievedDebugChunks([]);
    setExcludedChunkIds([]);

    try {
      const response = await fetch(`${API_BASE}/local/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: activeId || undefined,
          question: questionText,
          collectionId: activeCol.id,
          topK: settings.topK,
          minScore: settings.similarityThreshold,
          retrievalStrategy: settings.retrievalStrategy,
          overrideChunks: overrideChunksInput || undefined,
        }),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.statusText}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream reader');

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let citationsList: Citation[] = [];
      const tempId = tempMsgIdRef.current;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'citation') {
                  citationsList = parsed.data;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === tempId ? { ...m, citations: citationsList } : m
                    )
                  );
                } else if (parsed.type === 'token') {
                  accumulatedText += parsed.data;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === tempId ? { ...m, content: accumulatedText } : m
                    )
                  );
                } else if (parsed.type === 'metrics') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === tempId ? { ...m, metrics: parsed.data } : m
                    )
                  );
                }
              } catch (e) {
                // Fragment catch
              }
            }
          }
        }
      }

      const newId = Math.random().toString(36).substring(2, 11);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, id: newId } : m
        )
      );

      if (settings.ttsEnabled && accumulatedText) {
        speakText(accumulatedText, () => setSpeakingMessageId(null));
        setSpeakingMessageId(newId);
      }

      queryClient.invalidateQueries({ queryKey: ['history'] });
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMsgIdRef.current
            ? { ...m, content: `⚠️ Local RAG failed: ${err.message}` }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
      tempMsgIdRef.current = null;
    }
  };

  const getTraceStripColor = (similarity: number) => {
    if (similarity >= 0.85) return 'bg-accent-cyan';
    if (similarity >= 0.65) return 'bg-accent-amber';
    return 'bg-text-muted';
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-x divide-border-hairline overflow-hidden bg-surface-0 min-h-0">
      
      <div className={`${activeDocumentId ? 'hidden md:flex md:max-w-xl lg:max-w-2xl' : 'flex'} flex-1 flex-col min-w-0`}>
        
        <div className="flex justify-between items-center p-3 md:p-4 border-b border-border-hairline bg-surface-1 shrink-0">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-accent-cyan" />
            <span className="text-xs font-bold text-text-primary">Source Documents</span>
          </div>

          <div className="flex items-center gap-1.5 border border-border-hairline rounded-lg px-2.5 py-1 bg-surface-2">
            <Layers className="h-3.5 w-3.5 text-text-muted animate-pulse" />
            <select
              value={activeCol.id}
              onChange={(e) => {
                dispatch(setActiveDocumentId(null));
              }}
              className="bg-transparent border-none text-[11px] font-bold focus:outline-none text-text-primary max-w-[130px] cursor-pointer"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeDocumentId && activeDoc ? (
          <div className="flex-1 flex flex-col bg-surface-1 relative">
            <div className="flex justify-between items-center px-4 py-2 border-b border-border-hairline bg-surface-2/40 shrink-0">
              <button
                onClick={() => dispatch(setActiveDocumentId(null))}
                className="text-[10px] font-bold text-accent-violet hover:underline flex items-center gap-0.5"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <span className="text-[10px] text-text-primary font-bold truncate max-w-[150px] md:max-w-xs">{activeDoc.name}</span>
              <a
                href={api.downloadDocumentUrl(activeDoc.id)}
                download
                className="text-[10px] text-accent-cyan hover:underline flex items-center gap-0.5"
              >
                <ExternalLink className="h-3 w-3" /> Download
              </a>
            </div>

            <div className="flex-1 bg-surface-0">
              <iframe
                src={`${api.downloadDocumentUrl(activeDoc.id)}#toolbar=0`}
                className="w-full h-full border-none"
                title="RAG Context PDF Viewer"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 scrollbar-thin">
            <div className="space-y-1.5">
              <h2 className="text-sm font-bold text-text-primary">Indexed Source Files</h2>
              <p className="text-xs text-text-muted">
                These documents are processed in collection **"{activeCol.name}"** and queried by the local RAG engine.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {collectionDocs.length === 0 ? (
                <div className="text-center py-12 md:py-16 border border-dashed border-border-hairline rounded-xl p-4 md:p-6 bg-surface-1 text-text-muted text-xs">
                  No documents in collection.<br />Use the Documents tab to upload files.
                </div>
              ) : (
                collectionDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => dispatch(setActiveDocumentId(doc.id))}
                    className="w-full flex items-center justify-between p-3 md:p-4 rounded-xl border border-border-hairline bg-surface-1 hover:bg-surface-2 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                      <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan shrink-0">
                        <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <span className="text-[11px] md:text-xs font-bold text-text-primary truncate block group-hover:text-accent-cyan transition-colors" title={doc.name}>
                          {doc.name}
                        </span>
                        <span className="text-[8px] md:text-[9px] text-text-muted font-mono block mt-0.5">
                          {doc.chunksCount} chunks · {(doc.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-accent-cyan flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open <ChevronRight className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="rounded-xl border border-border-hairline bg-surface-1 p-3 md:p-4 space-y-2">
              <span className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <HelpCircle className="h-3.5 w-3.5 text-accent-cyan" /> Suggested Queries
              </span>
              <p className="text-[10px] md:text-xs text-text-muted leading-relaxed">
                Try asking detailed questions based on the sources:
              </p>
              <ul className="text-[9px] md:text-[10px] text-text-muted space-y-1 font-mono list-disc list-inside">
                <li>"Summarize key methodologies"</li>
                <li>"Extract findings from page 2"</li>
                <li>"Compare results with baseline models"</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <div className="flex justify-between items-center p-3 md:p-4 border-b border-border-hairline bg-surface-1 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent-cyan" />
            <div className="flex flex-col">
              <span className="text-[11px] md:text-xs font-bold text-text-primary truncate max-w-[150px] md:max-w-[200px]">
                {activeConv?.title || 'Local RAG Chat'}
              </span>
              <span className="text-[8px] md:text-[9px] font-mono text-text-muted uppercase tracking-wider">
                Ollama: Llama3.2 · {activeCol.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={() => setIsRAGDebugActive(!isRAGDebugActive)}
              className={`flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider border transition-all ${
                isRAGDebugActive
                  ? 'bg-accent-rose/10 border-accent-rose/30 text-accent-rose'
                  : 'bg-surface-2 border-border-hairline text-text-muted hover:text-text-primary'
              }`}
              title="Toggle RAG pre-execution debug panel"
            >
              <Sliders className="h-3 w-3 md:h-3.5 md:w-3.5 animate-pulse" />
              Debug Mode
            </button>

            {activeDocumentId && (
              <button
                onClick={() => dispatch(setActiveDocumentId(null))}
                className="md:hidden text-[10px] text-accent-cyan font-bold flex items-center gap-1"
              >
                <FileSearch className="h-3 w-3" /> Sources
              </button>
            )}
          </div>
        </div>

        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6 scrollbar-thin relative"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 md:space-y-4 max-w-sm mx-auto">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan animate-pulse">
                <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-bold text-text-primary">Offline RAG Assistant Active</span>
                <p className="text-[10px] md:text-xs text-text-muted leading-relaxed">
                  Ask questions. The LLM will answer utilizing **only** local document vectors in **"{activeCol.name}"**.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 md:gap-4 max-w-2xl md:max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div
                    className={`h-7 w-7 md:h-8 md:w-8 rounded-lg shrink-0 flex items-center justify-center border shadow-sm ${
                      isUser
                        ? 'bg-surface-2 border-border-hairline text-text-muted'
                        : 'bg-gradient-to-tr from-accent-cyan to-accent-violet border-accent-cyan/25 text-white animate-pulse'
                    }`}
                  >
                    {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    {!isUser && m.citations && m.citations.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-1.5 px-1 py-0.5 rounded bg-surface-2/30 border border-border-hairline/40 max-w-max select-none">
                        <span className="text-[7px] md:text-[8px] font-mono text-text-muted uppercase tracking-wider">Trace Strip:</span>
                        <div className="flex items-center gap-1 px-1">
                          {m.citations.map((c, i) => (
                            <button
                              key={i}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredCitation({
                                  citation: c,
                                  x: rect.left,
                                  y: rect.top - 120,
                                });
                              }}
                              onMouseLeave={() => setHoveredCitation(null)}
                              onClick={() => {
                                dispatch(setActiveDocumentId(c.documentId));
                              }}
                              className={`h-2 w-2 rounded-full cursor-pointer hover:scale-125 transition-transform ${getTraceStripColor(
                                c.similarity
                              )}`}
                              title={`Source ${i + 1}: ${c.documentName}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`p-3 md:p-4 rounded-xl pr-6 md:pr-8 relative group ${
                        isUser
                          ? 'bg-accent-violet-soft text-text-primary border border-accent-violet/10'
                          : 'bg-transparent text-text-primary prose prose-invert max-w-none font-normal leading-relaxed'
                      }`}
                    >
                      {!isUser && m.content && m.id !== 'assistant_temp' && (
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(m)}
                          className="absolute top-1.5 right-1.5 md:top-2 md:right-2 p-0.5 md:p-1 rounded hover:bg-surface-2 text-text-muted hover:text-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {speakingMessageId === m.id ? (
                            <VolumeX className="h-3 w-3 md:h-3.5 md:w-3.5 text-accent-cyan" />
                          ) : (
                            <Volume2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          )}
                        </button>
                      )}
                      
                      <div className="text-[10px] md:text-xs prose prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>

                      {!isUser && m.citations && m.citations.length > 0 && (
                        <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-border-hairline flex flex-wrap gap-1.5 md:gap-2">
                          {m.citations.map((cit, idx) => (
                            <button
                              key={idx}
                              onClick={() => dispatch(setActiveDocumentId(cit.documentId))}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-2 border border-border-hairline text-[9px] md:text-[10px] text-text-muted hover:text-text-primary transition-all font-mono"
                            >
                              [{idx + 1}] {cit.documentName.substring(0, 12)}... ({(cit.similarity * 100).toFixed(0)}%)
                            </button>
                          ))}
                        </div>
                      )}

                      {!isUser && m.metrics && (
                        <div className="mt-2 md:mt-3 pt-1.5 md:pt-2 border-t border-border-hairline flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 text-[8px] md:text-[9px] font-mono text-text-muted">
                          <span>Search: {m.metrics.searchTimeMs}ms</span>
                          <span>Gen: {m.metrics.generationTimeMs}ms</span>
                          <span>Checked: {m.metrics.chunksSearchedCount}</span>
                          <span>Avg Sim: {(m.metrics.avgSimilarityScore * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        <AnimatePresence>
          {isRAGDebugActive && isDebugViewOpen && retrievedDebugChunks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="mx-3 md:mx-6 p-3 md:p-4 rounded-xl border border-accent-rose/20 bg-surface-1 shadow-lg max-h-64 md:max-h-80 overflow-y-auto space-y-3 md:space-y-4 shrink-0 scrollbar-thin"
            >
              <div className="flex justify-between items-center border-b border-border-hairline pb-2">
                <div className="flex items-center gap-1.5 text-accent-rose text-[10px] md:text-xs font-bold font-mono">
                  <BadgeAlert className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  RAG Pre-Execution Evaluator ({retrievedDebugChunks.length - excludedChunkIds.length} active chunks)
                </div>
                <button
                  onClick={() => setIsDebugViewOpen(false)}
                  className="text-[9px] md:text-[10px] text-text-muted hover:text-text-primary font-mono"
                >
                  [Minimize]
                </button>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                {retrievedDebugChunks.map((chunk, idx) => {
                  const isExcluded = excludedChunkIds.includes(`${chunk.documentId}_${chunk.chunkIndex}`);
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 md:gap-3 p-2.5 md:p-3 rounded-lg border transition-all ${
                        isExcluded
                          ? 'opacity-40 bg-surface-0 border-border-hairline'
                          : 'bg-surface-2 border-border-hairline hover:border-accent-cyan/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => {
                          const key = `${chunk.documentId}_${chunk.chunkIndex}`;
                          if (isExcluded) {
                            setExcludedChunkIds(excludedChunkIds.filter((id) => id !== key));
                          } else {
                            setExcludedChunkIds([...excludedChunkIds, key]);
                          }
                        }}
                        className="mt-1 cursor-pointer shrink-0 accent-accent-cyan"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center text-[9px] md:text-[10px] font-mono text-text-muted mb-1">
                          <span className="truncate max-w-[120px] md:max-w-[180px] font-bold text-text-primary">{chunk.documentName}</span>
                          <span>Score: {(chunk.similarity * 100).toFixed(0)}% · Page {chunk.pageNumber || 'N/A'}</span>
                        </div>
                        <p className="text-[10px] md:text-xs text-text-primary leading-relaxed font-sans line-clamp-2 md:line-clamp-3">
                          {chunk.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-1.5 md:gap-2 pt-1.5 md:pt-2 border-t border-border-hairline">
                <Button variant="secondary" size="sm" onClick={() => {
                  setRetrievedDebugChunks([]);
                  setExcludedChunkIds([]);
                  setIsDebugViewOpen(false);
                }}>
                  Discard
                </Button>
                <Button variant="primary" size="sm" onClick={() => {
                  const activeChunks = retrievedDebugChunks.filter(
                    (c) => !excludedChunkIds.includes(`${c.documentId}_${c.chunkIndex}`)
                  );
                  handleSendMessage(undefined, activeChunks);
                }}>
                  <Play className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                  Generate Answer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {transcribing && (
          <div className="mx-3 md:mx-6 p-2.5 md:p-3 bg-accent-violet-soft border border-accent-violet/20 rounded-xl flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-accent-violet animate-pulse shrink-0">
            <Loader className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin shrink-0" />
            <span>Whisper-large-v3 model is transcribing dictation blob...</span>
          </div>
        )}

        <div className="p-3 md:p-4 border-t border-border-hairline bg-surface-1/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isRAGDebugActive) {
                handleRetrieveChunksOnly();
              } else {
                handleSendMessage(e);
              }
            }}
            className="flex items-center gap-1.5 md:gap-2 border border-border-hairline rounded-2.5xl p-1 md:p-1.5 focus-within:ring-1 focus-within:ring-accent-cyan bg-surface-1 shadow-sm"
          >
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="p-1.5 md:p-2 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-accent-rose flex items-center gap-1.5 hover:bg-accent-rose/20 transition-all animate-pulse shrink-0"
              >
                <MicOff className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent-rose" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={transcribing}
                className="p-1.5 md:p-2 rounded-xl border border-border-hairline bg-surface-2 text-text-muted hover:text-text-primary transition-all disabled:opacity-50 shrink-0"
                title="Dictate message"
              >
                <Mic className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
            )}

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isGenerating || isRecording}
              placeholder={
                isRAGDebugActive
                  ? "Evaluate mode: enter prompt to retrieve chunks first..."
                  : "Ask a question about the collection sources..."
              }
              className="flex-1 bg-transparent border-none focus:outline-none text-[10px] md:text-xs py-1.5 md:py-2 px-1.5 md:px-2 text-text-primary placeholder-text-muted font-sans min-w-0"
            />
            
            <button
              type="submit"
              disabled={!inputMessage.trim() || isGenerating || isRecording || debugLoading}
              className="p-1.5 md:p-2.5 rounded-xl bg-accent-cyan text-white hover:bg-accent-cyan/90 transition-all disabled:opacity-30 shrink-0"
            >
              {isGenerating || debugLoading ? (
                <Loader className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
              )}
            </button>
          </form>
        </div>
      </div>

      {hoveredCitation && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredCitation.x - 120}px`,
            top: `${hoveredCitation.y}px`,
          }}
          className="z-50 w-60 md:w-72 p-2.5 md:p-3.5 rounded-xl border border-border-hairline bg-surface-1 shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none select-none font-sans"
        >
          <div className="flex items-center justify-between mb-1.5 md:mb-2">
            <span className="text-[9px] md:text-[10px] font-bold text-accent-cyan truncate max-w-[100px] md:max-w-[150px] font-mono">
              {hoveredCitation.citation.documentName}
            </span>
            <span className="text-[8px] md:text-[9px] font-mono text-text-muted">
              Score: {(hoveredCitation.citation.similarity * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-[10px] md:text-[11px] text-text-muted leading-relaxed line-clamp-2 md:line-clamp-3 leading-normal italic">
            "{hoveredCitation.citation.text}"
          </p>
        </div>
      )}
    </div>
  );
}