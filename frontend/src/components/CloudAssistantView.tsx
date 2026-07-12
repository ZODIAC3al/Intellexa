'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { setActiveConversationId } from '../redux/slices/uiSlice';
import { updateRagSettings } from '../redux/slices/ragSlice';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_BASE } from '../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Cloud,
  Send,
  Image as ImageIcon,
  Mic,
  MicOff,
  Loader,
  Copy,
  Check,
  Download,
  Maximize2,
  User,
  Bot,
  Volume2,
  VolumeX,
  Sliders,
  Settings,
  Flame,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Conversation, Message } from '../../../shared/types';
import { speakText, stopSpeaking } from '../utils/speech';

export default function CloudAssistantView() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const settings = useSelector((state: RootState) => state.rag);
  const activeConversationId = useSelector((state: RootState) => state.ui.activeConversationId);
  const theme = useSelector((state: RootState) => state.ui.theme);

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Right sidebar configurations
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Image zoom and copy status
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Stop speaking on unmount
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

  // Fetch active conversation details
  const { data: activeConv } = useQuery<Conversation | undefined>({
    queryKey: ['conversation', activeConversationId],
    queryFn: () => (activeConversationId ? api.getHistory().then((list) => list.find((c) => c.id === activeConversationId)) : Promise.resolve(undefined)),
    enabled: !!activeConversationId,
  });

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  // Recording audio
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
          console.error('Transcription failed:', err);
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Generate Image from prompts
  const handleImageGeneration = async (promptText: string) => {
    isNearBottomRef.current = true;
    setIsGenerating(true);
    const userMsg: Message = {
      id: Math.random().toString(36).substring(2, 11),
      role: 'user',
      content: `Generate an image: "${promptText}"`,
      timestamp: new Date().toISOString(),
    };
    
    const botMsg: Message = {
      id: Math.random().toString(36).substring(2, 11),
      role: 'assistant',
      content: 'Generating image, please wait...',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);

    try {
      const res = await api.generateImage(promptText);
      const completedBotMsg: Message = {
        ...botMsg,
        content: `Generated image: **"${promptText}"**`,
        imageUrls: [res.base64Url],
      };

      setMessages((prev) => prev.map((m) => (m.id === botMsg.id ? completedBotMsg : m)));
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Image generated successfully');
    } catch (err: any) {
      const errorBotMsg: Message = {
        ...botMsg,
        content: `⚠️ Failed to generate image: ${err.message}`,
      };
      setMessages((prev) => prev.map((m) => (m.id === botMsg.id ? errorBotMsg : m)));
      toast.error(`Image generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit standard text prompts
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;

    isNearBottomRef.current = true;
    const textToSend = inputMessage.trim();
    setInputMessage('');

    if (isImageMode || textToSend.startsWith('/image ')) {
      const prompt = textToSend.startsWith('/image ') ? textToSend.substring(7) : textToSend;
      await handleImageGeneration(prompt);
      return;
    }

    setIsGenerating(true);

    let activeId = activeConversationId;
    if (!activeId) {
      try {
        const newChat = await api.createConversation('cloud', textToSend.substring(0, 30));
        activeId = newChat.id;
        dispatch(setActiveConversationId(newChat.id));
        queryClient.invalidateQueries({ queryKey: ['history'] });
      } catch (err) {
        console.error('Failed to create new conversation:', err);
      }
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 11),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    const assistantMessagePlaceholder: Message = {
      id: 'assistant_temp',
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessagePlaceholder]);

    const messagesHistoryToSend = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

try {
       const response = await fetch(`${API_BASE}/chat`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         credentials: 'include',
         body: JSON.stringify({
           conversationId: activeId || undefined,
           messages: messagesHistoryToSend,
           temperature: settings.temperature,
           topP: settings.topP,
           maxTokens: settings.maxTokens,
         }),
       });

      if (!response.ok) throw new Error(`HTTP Error: ${response.statusText}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable response stream');

      const decoder = new TextDecoder();
      let accumulated = '';

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
                if (parsed.content) {
                  accumulated += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === 'assistant_temp' ? { ...m, content: accumulated } : m
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
          m.id === 'assistant_temp' ? { ...m, id: newId } : m
        )
      );

      if (settings.ttsEnabled && accumulated) {
        speakText(accumulated, () => setSpeakingMessageId(null));
        setSpeakingMessageId(newId);
      }
      
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === 'assistant_temp'
            ? { ...m, content: `⚠️ Failed to fetch cloud completions: ${err.message}` }
            : m
        )
      );
      toast.error(`Failed to fetch cloud completions: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex divide-x divide-border-hairline overflow-hidden bg-surface-0">
      
      {/* LEFT AREA: Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header bar */}
        <div className="flex justify-between items-center p-4 border-b border-border-hairline bg-surface-1 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <Cloud className="h-4.5 w-4.5 text-accent-violet animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-text-primary truncate max-w-[200px]">
                {activeConv?.title || 'Cloud Chat Workspace'}
              </span>
              <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                {settings.cloudModel.split('/').pop()} · HuggingFace API
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Image Mode pill */}
            <button
              onClick={() => setIsImageMode(!isImageMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                isImageMode
                  ? 'bg-accent-violet-soft border-accent-violet/30 text-accent-violet'
                  : 'bg-surface-2 border-border-hairline text-text-muted hover:text-text-primary'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Image Generation
            </button>
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`p-1.5 rounded-lg hover:bg-surface-2 border transition-all ${
                isRightSidebarOpen ? 'text-accent-violet border-accent-violet/20 bg-accent-violet-soft' : 'text-text-muted border-border-hairline'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Message stream */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 scrollbar-thin"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
              <div className="h-12 w-12 rounded-full bg-accent-violet-soft border border-accent-violet/20 flex items-center justify-center text-accent-violet animate-pulse">
                <Cloud className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-bold text-text-primary">HuggingFace Assistant</span>
                <p className="text-xs text-text-muted leading-relaxed">
                  Start typing to interact with Llama-3. Or enable **Image Generation** to create visuals using FLUX models.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-4 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border shadow-sm ${
                      isUser
                        ? 'bg-surface-2 border-border-hairline text-text-muted'
                        : 'bg-gradient-to-tr from-accent-violet to-accent-violet/60 border-accent-violet/30 text-white animate-pulse'
                    }`}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div className="space-y-1">
                    {/* Chat Bubble */}
                    <div
                      className={`p-4 rounded-xl pr-8 relative group ${
                        isUser
                          ? 'bg-accent-violet-soft text-text-primary border border-accent-violet/10'
                          : 'bg-transparent text-text-primary prose prose-invert max-w-none font-normal leading-relaxed'
                      }`}
                    >
                      {!isUser && m.content && m.id !== 'assistant_temp' && (
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(m)}
                          className="absolute top-2 right-2 p-1 rounded hover:bg-surface-2 text-text-muted hover:text-accent-violet opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {speakingMessageId === m.id ? (
                            <VolumeX className="h-3.5 w-3.5 text-accent-violet" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      
                      <div className="text-xs prose prose-invert">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const id = Math.random().toString();
                              return !inline && match ? (
                                <div className="relative my-3 rounded-lg overflow-hidden border border-border-hairline bg-surface-1 shadow-sm">
                                  <div className="flex justify-between items-center px-4 py-1.5 bg-surface-2 text-[10px] text-text-muted font-mono uppercase border-b border-border-hairline">
                                    <span>{match[1]}</span>
                                    <button
                                      onClick={() => copyToClipboard(String(children).replace(/\n$/, ''), id)}
                                      className="hover:text-text-primary flex items-center gap-1 transition-colors"
                                    >
                                      {copiedTextId === id ? (
                                        <>
                                          <Check className="h-3 w-3 text-accent-cyan" /> Copied
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3 w-3" /> Copy
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{ margin: 0, padding: '12px', fontSize: '11px', background: 'transparent' }}
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                </div>
                              ) : (
                                <code className="bg-surface-2 border border-border-hairline px-1.5 py-0.5 rounded font-mono text-[10px]" {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>

                      {/* Generated image outputs */}
                      {m.imageUrls && m.imageUrls.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 pt-2">
                          {m.imageUrls.map((url, i) => (
                            <div key={i} className="relative rounded-lg overflow-hidden group/img border border-border-hairline max-w-sm">
                              <img src={url} alt="Generated visual output" className="w-full h-auto object-cover max-h-72" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button
                                  onClick={() => setFullscreenImage(url)}
                                  className="p-1.5 rounded-lg bg-surface-1 border border-border-hairline text-text-primary hover:bg-surface-2 transition-all"
                                  title="Expand"
                                >
                                  <Maximize2 className="h-4 w-4" />
                                </button>
                                <a
                                  href={url}
                                  download={`generation_${m.id}.png`}
                                  className="p-1.5 rounded-lg bg-surface-1 border border-border-hairline text-text-primary hover:bg-surface-2 transition-all"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          ))}
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

        {/* Whisper transcription alert */}
        {transcribing && (
          <div className="mx-6 p-3 bg-accent-violet-soft border border-accent-violet/20 rounded-xl flex items-center gap-3 text-xs text-accent-violet animate-pulse shrink-0">
            <Loader className="h-4 w-4 animate-spin shrink-0" />
            <span>Whisper-large-v3 model is transcribing dictation blob...</span>
          </div>
        )}

        {/* Composer section */}
        <div className="p-4 border-t border-border-hairline bg-surface-1/40">
          <form
            onSubmit={handleSendMessage}
            className="max-w-3xl mx-auto flex items-center gap-2 border border-border-hairline rounded-2.5xl p-1.5 focus-within:ring-1 focus-within:ring-accent-violet bg-surface-1 shadow-sm"
          >
            {/* Mic Speech Button */}
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="p-2 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-accent-rose flex items-center gap-1.5 hover:bg-accent-rose/20 transition-all animate-pulse shrink-0"
              >
                <MicOff className="h-4 w-4 text-accent-rose" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={transcribing}
                className="p-2 rounded-xl border border-border-hairline bg-surface-2 text-text-muted hover:text-text-primary transition-all disabled:opacity-50 shrink-0"
                title="Dictate message"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isGenerating || isRecording}
              placeholder={
                isImageMode
                  ? "Describe image prompt (e.g. 'A futuristic workspace')"
                  : "Ask Cloud Assistant anything..."
              }
              className="flex-1 bg-transparent border-none focus:outline-none text-xs py-2 px-2 text-text-primary placeholder-text-muted font-sans"
            />
            
            <button
              type="submit"
              disabled={!inputMessage.trim() || isGenerating || isRecording}
              className="p-2.5 rounded-xl bg-accent-violet text-white hover:bg-accent-violet/90 transition-all disabled:opacity-30 shrink-0"
            >
              {isGenerating ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL: Settings Rail */}
      <AnimatePresence>
        {isRightSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="hidden md:flex flex-col border-l border-border-hairline bg-surface-1 p-5 shrink-0 h-full overflow-y-auto space-y-6 scrollbar-thin font-sans"
          >
            <div className="flex justify-between items-center pb-3 border-b border-border-hairline">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono flex items-center gap-1">
                <Settings className="h-3.5 w-3.5" />
                Parameters
              </span>
              <button
                onClick={() => setIsRightSidebarOpen(false)}
                className="text-[10px] font-mono text-text-muted hover:text-text-primary"
              >
                [Close]
              </button>
            </div>

            {/* Model Selector tabs */}
            <div className="space-y-2">
              <label className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Model ID</label>
              <div className="p-3.5 rounded-lg border border-border-hairline bg-surface-2 flex items-center gap-2">
                <Bot className="h-4 w-4 text-accent-violet shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-primary block truncate">Llama-3-8b-instruct</span>
                  <span className="text-[8px] text-text-muted font-mono block mt-0.5">Meta AI / HuggingFace</span>
                </div>
              </div>
            </div>

            {/* Temperature slide */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-accent-amber" />
                  Temperature
                </span>
                <span className="font-mono font-bold text-text-primary">{settings.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => dispatch(updateRagSettings({ temperature: parseFloat(e.target.value) }))}
                className="w-full accent-accent-violet bg-surface-2 border border-border-hairline h-1 rounded"
              />
              <p className="text-[9px] text-text-muted leading-normal">
                Higher values lead to more creative, less structured outcomes.
              </p>
            </div>
 
            {/* Max Token stepper */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-accent-violet" />
                  Max Tokens
                </span>
                <span className="font-mono font-bold text-text-primary">{settings.maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="4096"
                step="256"
                value={settings.maxTokens}
                onChange={(e) => dispatch(updateRagSettings({ maxTokens: parseInt(e.target.value) }))}
                className="w-full accent-accent-violet bg-surface-2 border border-border-hairline h-1 rounded"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Overlay */}
      {fullscreenImage && (
        <div
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
        >
          <img src={fullscreenImage} alt="Fullscreen visual output" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain border border-border-hairline" />
        </div>
      )}

    </div>
  );
}
