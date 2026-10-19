import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types/chat';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <div className={`bubble-row ${isUser ? 'user-row' : 'ai-row'}`}>
      {!isUser && (
        <div className="avatar ai-avatar">
          <span>ψ</span>
        </div>
      )}

      <div className={`bubble-wrapper ${isUser ? 'user-wrapper' : 'ai-wrapper'}`}>
        <div className={`bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
          {isUser ? (
            <p className="user-content">{message.content}</p>
          ) : (
            <div className="ai-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="cursor-blink">▊</span>}
            </div>
          )}
        </div>

        <div className="bubble-footer">
          <span className="bubble-time">{time}</span>
          {!isUser && !isStreaming && (
            <button
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title={copied ? 'Tersalin ke clipboard' : 'Salin jawaban'}
              aria-label="Salin jawaban"
            >
              {copied ? (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Salin</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="avatar user-avatar">
          <span>U</span>
        </div>
      )}

      <style>{`
        .bubble-row {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          animation: bubbleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .user-row { flex-direction: row-reverse; }
        .ai-row { flex-direction: row; }

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        .ai-avatar {
          background: rgba(0, 212, 255, 0.08);
          border: 1.5px solid var(--border-accent);
          color: var(--accent-primary);
          font-family: var(--font-mono);
          font-size: 1rem;
          box-shadow: 0 0 12px var(--accent-glow-soft);
        }

        .user-avatar {
          background: rgba(14, 165, 233, 0.2);
          border: 1.5px solid rgba(14, 165, 233, 0.3);
          color: #7dd3fc;
          font-family: var(--font-sans);
        }

        .bubble-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          max-width: min(80%, 720px);
        }

        .user-wrapper { align-items: flex-end; }
        .ai-wrapper { align-items: flex-start; }

        .bubble {
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.875rem;
          line-height: 1.65;
          position: relative;
          word-break: break-word;
        }

        .user-bubble {
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(0, 212, 255, 0.15));
          border: 1px solid rgba(14, 165, 233, 0.25);
          border-top-right-radius: 4px;
          color: var(--text-primary);
        }

        .ai-bubble {
          background: var(--bg-glass-light);
          border: 1px solid var(--border-accent);
          border-top-left-radius: 4px;
          color: var(--text-primary);
          box-shadow: 0 0 15px var(--accent-glow-soft), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .user-content {
          margin: 0;
          white-space: pre-wrap;
        }

        .ai-content {
          line-height: 1.7;
        }

        /* Markdown styling inside ai-content */
        .ai-content p { margin: 0 0 0.6em; }
        .ai-content p:last-child { margin-bottom: 0; }
        .ai-content h1, .ai-content h2, .ai-content h3 {
          font-family: var(--font-display);
          color: var(--text-primary);
          margin: 0.75em 0 0.35em;
        }
        .ai-content h1 { font-size: 1.2em; }
        .ai-content h2 { font-size: 1.05em; }
        .ai-content h3 { font-size: 0.95em; }
        .ai-content code {
          font-family: var(--font-mono);
          font-size: 0.83em;
          background: rgba(0, 212, 255, 0.08);
          border: 1px solid rgba(0, 212, 255, 0.15);
          border-radius: 4px;
          padding: 0.15em 0.4em;
          color: var(--accent-primary);
        }
        .ai-content pre {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-medium);
          border-left: 3px solid var(--accent-primary);
          border-radius: 6px;
          padding: 1em;
          overflow-x: auto;
          margin: 0.75em 0;
        }
        .ai-content pre code {
          background: none;
          border: none;
          padding: 0;
          color: #e2e8f0;
          font-size: 0.82em;
        }
        .ai-content ul, .ai-content ol { padding-left: 1.4em; margin: 0.5em 0; }
        .ai-content li { margin-bottom: 0.25em; }
        .ai-content blockquote {
          border-left: 3px solid var(--accent-primary);
          padding-left: 1em;
          margin: 0.75em 0;
          color: var(--text-secondary);
          font-style: italic;
        }
        .ai-content strong { color: var(--text-primary); }
        .ai-content a { color: var(--accent-primary); text-decoration: underline; }
        .ai-content hr {
          border: none;
          border-top: 1px solid var(--border-subtle);
          margin: 0.75em 0;
        }
        .ai-content table {
          border-collapse: collapse;
          width: 100%;
          font-size: 0.85em;
          margin: 0.75em 0;
        }
        .ai-content th, .ai-content td {
          border: 1px solid var(--border-subtle);
          padding: 0.4em 0.75em;
          text-align: left;
        }
        .ai-content th { background: rgba(0, 212, 255, 0.05); color: var(--text-primary); }

        .cursor-blink {
          display: inline-block;
          color: var(--accent-primary);
          animation: blink 0.8s step-end infinite;
          font-family: var(--font-mono);
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .bubble-footer {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0 0.25rem;
        }

        .bubble-time {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        .copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 0.65rem;
          cursor: pointer;
          transition: all 0.2s ease;
          line-height: 1;
        }

        .copy-btn:hover {
          background: rgba(0, 212, 255, 0.1);
          border-color: var(--border-accent);
          color: var(--accent-primary);
          box-shadow: 0 0 8px var(--accent-glow-soft);
        }

        .copy-btn.copied {
          background: rgba(40, 200, 64, 0.15);
          border-color: rgba(40, 200, 64, 0.4);
          color: #4ade80;
        }
      `}</style>
    </div>
  );
}
