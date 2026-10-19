import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatSession, Message, UserInfo, ChatStatus } from '../types/chat';
import {
  getSessions,
  saveSession,
  deleteSession,
  getActiveSessionId,
  setActiveSessionId,
  createNewSession,
  generateSessionTitle,
  generateMessageId,
} from '../lib/storage';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import Sidebar from './Sidebar';

interface ModelOption {
  id: string;
  name: string;
  badge?: string;
}

const DEFAULT_MODELS: ModelOption[] = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)', badge: 'Best' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 (Reasoning)', badge: 'Reasoning' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', badge: 'Fast' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B (Google)', badge: 'Balanced' },
];

function formatEngineBadge(id: string): string {
  if (!id) return 'Llama-3.3-70b';
  if (id.includes('llama-3.3-70b')) return 'Llama-3.3-70b';
  if (id.includes('llama-3.1-70b')) return 'Llama-3.1-70b';
  if (id.includes('llama-3.1-8b')) return 'Llama-3.1-8b';
  if (id.includes('llama-3.2-11b')) return 'Llama-3.2-11b';
  if (id.includes('llama-3.2-3b')) return 'Llama-3.2-3b';
  if (id.includes('llama-3.2-1b')) return 'Llama-3.2-1b';
  if (id.includes('deepseek-r1')) return 'DeepSeek-R1';
  if (id.includes('gemma2-9b') || id.includes('gemma-2-9b')) return 'Gemma-2-9b';
  if (id.includes('mixtral')) return 'Mixtral-8x7b';
  if (id.includes('gpt-oss-120b')) return 'GPT-OSS-120b';
  return id.replace(/^.*\//, '');
}

interface ChatAppProps {
  userInfo: UserInfo;
}

export default function ChatApp({ userInfo }: ChatAppProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [streamingContent, setStreamingContent] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [currentModel, setCurrentModel] = useState<string>('llama-3.3-70b-versatile');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch available models from backend
  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
          const bestModel = data.defaultModel || data.models[0].id;
          setCurrentModel((prev) => activeSession?.model || prev || bestModel);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch models:', err);
      });
  }, []);

  // Sync currentModel when activeSession changes
  useEffect(() => {
    if (activeSession?.model) {
      setCurrentModel(activeSession.model);
    }
  }, [activeSession?.id, activeSession?.model]);

  // Load sessions from localStorage
  useEffect(() => {
    const stored = getSessions();
    setSessions(stored);

    const activeId = getActiveSessionId();
    if (activeId && stored.length > 0) {
      const found = stored.find((s) => s.id === activeId);
      const chosen = found ?? stored[0];
      setActiveSession(chosen);
      if (chosen.model) {
        setCurrentModel(chosen.model);
      }
    } else if (stored.length > 0) {
      setActiveSession(stored[0]);
      if (stored[0].model) {
        setCurrentModel(stored[0].model);
      }
    } else {
      const newSession = createNewSession(currentModel);
      setSessions([newSession]);
      setActiveSession(newSession);
      saveSession(newSession);
      setActiveSessionId(newSession.id);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, streamingContent]);

  const handleModelChange = useCallback(
    (newModel: string) => {
      setCurrentModel(newModel);
      if (activeSession) {
        const updatedSession: ChatSession = {
          ...activeSession,
          model: newModel,
          updatedAt: Date.now(),
        };
        setActiveSession(updatedSession);
        saveSession(updatedSession);
        setSessions(getSessions());
      }
    },
    [activeSession]
  );

  const handleNewChat = useCallback(() => {
    const newSession = createNewSession(currentModel);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSession(newSession);
    saveSession(newSession);
    setActiveSessionId(newSession.id);
    setStreamingContent('');
    setStatus('idle');
  }, [currentModel]);

  const handleSelectSession = useCallback((session: ChatSession) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setActiveSession(session);
    setActiveSessionId(session.id);
    if (session.model) {
      setCurrentModel(session.model);
    }
    setStreamingContent('');
    setStatus('idle');
  }, []);

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      deleteSession(sessionId);
      const remaining = getSessions();
      setSessions(remaining);

      if (activeSession?.id === sessionId) {
        if (remaining.length > 0) {
          const next = remaining[0];
          setActiveSession(next);
          setActiveSessionId(next.id);
          if (next.model) setCurrentModel(next.model);
        } else {
          const newSession = createNewSession(currentModel);
          setSessions([newSession]);
          setActiveSession(newSession);
          saveSession(newSession);
          setActiveSessionId(newSession.id);
        }
      }
    },
    [activeSession, currentModel]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeSession || !content.trim() || status === 'streaming') return;

      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      // Update session with user message and ensure model is saved
      const updatedMessages = [...activeSession.messages, userMessage];
      const isFirstMessage = activeSession.messages.length === 0;
      const sessionModel = activeSession.model || currentModel;

      const updatedSession: ChatSession = {
        ...activeSession,
        title: isFirstMessage ? generateSessionTitle(content) : activeSession.title,
        messages: updatedMessages,
        model: sessionModel,
        updatedAt: Date.now(),
      };

      setActiveSession(updatedSession);
      saveSession(updatedSession);
      setSessions(getSessions());
      setStatus('streaming');
      setStreamingContent('');

      // Build messages array for API (only role + content)
      const apiMessages = updatedMessages.map(({ role, content }) => ({ role, content }));

      abortRef.current = new AbortController();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, model: sessionModel }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) throw new Error('API error');
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }

        // Finalize assistant message
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now(),
        };

        const finalSession: ChatSession = {
          ...updatedSession,
          messages: [...updatedMessages, assistantMessage],
          updatedAt: Date.now(),
        };

        setActiveSession(finalSession);
        saveSession(finalSession);
        setSessions(getSessions());
        setStreamingContent('');
        setStatus('idle');
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setStatus('idle');
          return;
        }
        setStatus('error');
        setStreamingContent('');
        console.error('Chat error:', err);
      }
    },
    [activeSession, status]
  );

  const handleStopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    if (streamingContent) {
      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: streamingContent + ' [spell interrupted]',
        timestamp: Date.now(),
      };
      if (activeSession) {
        const finalSession: ChatSession = {
          ...activeSession,
          messages: [...activeSession.messages, assistantMessage],
          updatedAt: Date.now(),
        };
        setActiveSession(finalSession);
        saveSession(finalSession);
        setSessions(getSessions());
      }
    }
    setStreamingContent('');
    setStatus('idle');
  }, [activeSession, streamingContent]);

  const messages = activeSession?.messages ?? [];

  return (
    <div className="chat-app-root">
      {/* macOS Window Frame */}
      <div className="main-window">
        {/* Window Title Bar */}
        <div className="window-title-bar">
          <div className="traffic-lights">
            <button className="tl tl-red" aria-label="Close" />
            <button className="tl tl-yellow" aria-label="Minimize" />
            <button className="tl tl-green" aria-label="Maximize" />
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((p) => !p)}
            aria-label="Toggle sidebar"
            title="Toggle Sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          </button>
          <div className="title-center">
            <span className="title-mono">AI-zeru — Zoltraak Spellcasting Terminal</span>
          </div>
          <div className="title-right">
            <div className="engine-badge" title={`Model aktif: ${currentModel}`}>
              <span className="status-dot-sm" />
              <span>Groq · {formatEngineBadge(currentModel)}</span>
            </div>
          </div>
        </div>

        {/* Window Body */}
        <div className="window-body">
          {/* Sidebar */}
          <Sidebar
            sessions={sessions}
            activeSession={activeSession}
            userInfo={userInfo}
            isOpen={sidebarOpen}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
          />

          {/* Main Chat Area */}
          <div className="chat-main">
            {/* Header */}
            <div className="chat-header">
              <div className="header-left">
                <span className="header-glyph">⚡</span>
                <div className="header-info">
                  <span className="header-title">
                    {activeSession?.title ?? 'New Spell'}
                  </span>
                  <div className="header-subtitle mono-text">
                    <span className="engine-label">AI-zeru Engine:</span>
                    <div className="model-selector-container">
                      <select
                        value={currentModel}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="model-select-control"
                        disabled={status === 'streaming'}
                        title="Pilih Model AI Groq"
                        aria-label="Pilih Model AI"
                      >
                        {availableModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.badge ? `(${m.badge})` : ''}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="model-chevron"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    <span className="header-sep">&nbsp;|&nbsp;</span> Mana: 100%{' '}
                    <span className="header-sep">&nbsp;|&nbsp;</span>{' '}
                    {status === 'streaming' ? (
                      <span className="status-casting">Casting spell...</span>
                    ) : (
                      <span className="status-ready">Ready</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="header-right">
                <span className="msg-count mono-text">
                  {messages.length > 0 ? `${messages.length} incantations` : 'Awaiting command'}
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area">
              {messages.length === 0 && !streamingContent && (
                <div className="empty-state">
                  <div className="empty-glyph">
                    <span>ψ</span>
                  </div>
                  <h2 className="empty-title">Summon AI-zeru</h2>
                  <p className="empty-desc">
                    Type your spell below to begin. Channel the arcane power of{' '}
                    <strong>Groq Llama-3.3-70b-versatile</strong> — the fastest AI in the realm.
                  </p>
                  <div className="empty-suggestions">
                    {[
                      '🔮 Explain quantum computing in simple terms',
                      '⚔️ Write a Python script to sort a list',
                      '📜 Summarize the history of the Roman Empire',
                      '🌌 What is the meaning of consciousness?',
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        className="suggestion-btn"
                        onClick={() =>
                          handleSendMessage(suggestion.slice(3).trim())
                        }
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {/* Streaming message */}
              {status === 'streaming' && streamingContent && (
                <MessageBubble
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingContent,
                    timestamp: Date.now(),
                  }}
                  isStreaming
                />
              )}

              {/* Streaming skeleton when no content yet */}
              {status === 'streaming' && !streamingContent && (
                <div className="streaming-skeleton">
                  <div className="skeleton-avatar">AI</div>
                  <div className="skeleton-content">
                    <div className="skeleton-line s1" />
                    <div className="skeleton-line s2" />
                    <div className="skeleton-line s3" />
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="error-message">
                  <span>⚠️</span>
                  <span>The spell failed — arcane conduit error. Please try again.</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <ChatInput
              onSend={handleSendMessage}
              onStop={handleStopStreaming}
              isStreaming={status === 'streaming'}
              disabled={status === 'error'}
            />
          </div>
        </div>
      </div>

      <style>{`
        .chat-app-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background-color: var(--bg-primary);
        }

        .main-window {
          width: 100%;
          max-width: 1400px;
          height: calc(100vh - 2rem);
          max-height: 900px;
          display: flex;
          flex-direction: column;
          background: var(--bg-glass);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--border-accent);
          border-radius: 12px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px var(--border-subtle),
            0 30px 80px rgba(0, 0, 0, 0.7),
            0 0 80px var(--accent-glow-soft);
          animation: windowAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes windowAppear {
          from { opacity: 0; transform: scale(0.97) translateY(15px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Title Bar */
        .window-title-bar {
          display: flex;
          align-items: center;
          padding: 0.65rem 1rem;
          background: rgba(0, 0, 0, 0.45);
          border-bottom: 1px solid var(--border-subtle);
          gap: 0.75rem;
          flex-shrink: 0;
          z-index: 10;
        }

        .traffic-lights {
          display: flex;
          gap: 7px;
          flex-shrink: 0;
        }

        .tl {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: filter 0.2s;
        }

        .tl:hover { filter: brightness(1.25); }
        .tl-red { background-color: var(--tl-red); box-shadow: 0 0 6px rgba(255,95,87,0.4); }
        .tl-yellow { background-color: var(--tl-yellow); box-shadow: 0 0 6px rgba(254,188,46,0.3); }
        .tl-green { background-color: var(--tl-green); box-shadow: 0 0 6px rgba(40,200,64,0.3); }

        .sidebar-toggle {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s, background 0.2s;
          flex-shrink: 0;
        }

        .sidebar-toggle:hover {
          color: var(--text-primary);
          background: var(--bg-glass-light);
        }

        .title-center {
          flex: 1;
          text-align: center;
        }

        .title-mono {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }

        .title-right {
          flex-shrink: 0;
        }

        .engine-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--text-muted);
          background: var(--bg-glass-light);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          padding: 0.2rem 0.6rem;
        }

        .status-dot-sm {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--tl-green);
          box-shadow: 0 0 6px rgba(40,200,64,0.6);
          flex-shrink: 0;
        }

        /* Window Body */
        .window-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Chat Main */
        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Chat Header */
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.25rem;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(0, 0, 0, 0.15);
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
        }

        .header-glyph {
          font-size: 1.25rem;
          flex-shrink: 0;
          filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.5));
        }

        .header-info {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          min-width: 0;
        }

        .header-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-subtitle {
          font-size: 0.68rem;
          color: var(--text-muted);
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .engine-label {
          color: var(--text-secondary);
        }

        .model-selector-container {
          display: inline-flex;
          align-items: center;
          position: relative;
        }

        .model-select-control {
          appearance: none;
          -webkit-appearance: none;
          background: rgba(0, 212, 255, 0.08);
          border: 1px solid var(--border-accent);
          color: var(--accent-primary);
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 500;
          padding: 0.15rem 1.4rem 0.15rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
          box-shadow: 0 0 8px var(--accent-glow-soft);
        }

        .model-select-control:hover:not(:disabled) {
          background: rgba(0, 212, 255, 0.16);
          border-color: var(--accent-primary);
          box-shadow: 0 0 12px var(--accent-glow-primary);
        }

        .model-select-control:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 14px var(--accent-glow-primary);
        }

        .model-select-control:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .model-select-control option {
          background: #0d121c;
          color: #e2e8f0;
        }

        .model-chevron {
          position: absolute;
          right: 0.4rem;
          pointer-events: none;
          color: var(--accent-primary);
          opacity: 0.8;
        }

        .header-sep {
          color: var(--border-subtle);
        }

        .mono-text { font-family: var(--font-mono); }

        .status-casting {
          color: var(--accent-primary);
          text-shadow: 0 0 8px var(--accent-primary);
        }

        .status-ready { color: var(--tl-green); }

        .header-right { flex-shrink: 0; }

        .msg-count {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* Messages Area */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          scroll-behavior: smooth;
        }

        /* Empty State */
        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 1rem;
          padding: 2rem;
          margin: auto;
          max-width: 520px;
        }

        .empty-glyph {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 2px solid var(--border-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 2rem;
          color: var(--accent-primary);
          box-shadow: 0 0 25px var(--accent-glow-soft);
          animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px var(--accent-glow-soft); }
          50% { box-shadow: 0 0 40px var(--accent-glow); }
        }

        .empty-title {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff, var(--accent-primary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .empty-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .empty-desc strong { color: var(--accent-primary); font-weight: 600; }

        .empty-suggestions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          width: 100%;
        }

        .suggestion-btn {
          background: var(--bg-glass-light);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 0.625rem 0.75rem;
          font-size: 0.78rem;
          color: var(--text-secondary);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          font-family: var(--font-sans);
        }

        .suggestion-btn:hover {
          background: rgba(0, 212, 255, 0.06);
          border-color: var(--border-accent);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        /* Streaming skeleton */
        .streaming-skeleton {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          padding: 0.5rem 0;
        }

        .skeleton-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid var(--border-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-family: var(--font-mono);
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .skeleton-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-top: 0.5rem;
        }

        .skeleton-line {
          height: 12px;
          border-radius: 6px;
          background: linear-gradient(90deg, var(--bg-glass-light) 25%, rgba(0, 212, 255, 0.08) 50%, var(--bg-glass-light) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .s1 { width: 280px; }
        .s2 { width: 220px; }
        .s3 { width: 180px; }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Error message */
        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 95, 87, 0.08);
          border: 1px solid rgba(255, 95, 87, 0.25);
          border-radius: 8px;
          font-size: 0.85rem;
          color: #fca5a5;
        }

        @media (max-width: 768px) {
          .chat-app-root { padding: 0; }
          .main-window { height: 100vh; max-height: 100vh; border-radius: 0; }
          .empty-suggestions { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
