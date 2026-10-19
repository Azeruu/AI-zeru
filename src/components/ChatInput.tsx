import { useState, useRef, useCallback, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, []);

  const handleSubmit = useCallback(() => {
    if (isStreaming) {
      onStop();
      return;
    }
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isStreaming, disabled, onSend, onStop]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="input-area">
      <div className="input-container">
        {/* Spell indicator */}
        <div className="spell-indicator">
          <span className={`spell-rune ${isStreaming ? 'casting' : ''}`}>⟨ψ⟩</span>
        </div>

        <textarea
          ref={textareaRef}
          id="chat-input"
          className="chat-textarea"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Cast your spell... (Enter to send, Shift+Enter for new line)"
          rows={1}
          disabled={disabled}
          aria-label="Chat input"
        />

        <button
          id="send-button"
          className={`send-btn ${isStreaming ? 'stop-btn' : 'cast-btn'}`}
          onClick={handleSubmit}
          disabled={disabled && !isStreaming}
          aria-label={isStreaming ? 'Stop streaming' : 'Send message'}
          title={isStreaming ? 'Stop (interrupt spell)' : 'Cast spell (Enter)'}
        >
          {isStreaming ? (
            <span className="btn-icon-stop">■</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M15.5 9L2.5 2.5L5.5 9L2.5 15.5L15.5 9Z"
                fill="currentColor"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      <div className="input-hint">
        <span className="hint-text mono-text">
          {isStreaming
            ? '⚡ AI-zeru is casting...'
            : `Enter ↵ to cast · Shift+Enter for new line · ${value.length > 0 ? `${value.length} chars` : ''}`}
        </span>
      </div>

      <style>{`
        .input-area {
          padding: 0.875rem 1.25rem 1rem;
          border-top: 1px solid var(--border-subtle);
          background: rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }

        .input-container {
          display: flex;
          align-items: flex-end;
          gap: 0.625rem;
          background: var(--bg-glass-light);
          border: 1.5px solid var(--border-accent);
          border-radius: 10px;
          padding: 0.625rem 0.625rem 0.625rem 0.875rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-container:focus-within {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-glow-soft), 0 0 20px var(--accent-glow-soft);
        }

        .spell-indicator {
          padding-bottom: 0.2rem;
          flex-shrink: 0;
        }

        .spell-rune {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--text-muted);
          transition: color 0.3s, text-shadow 0.3s;
          user-select: none;
        }

        .spell-rune.casting {
          color: var(--accent-primary);
          text-shadow: 0 0 10px var(--accent-primary);
          animation: runeFlicker 1s ease-in-out infinite;
        }

        @keyframes runeFlicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .chat-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          font-family: var(--font-sans);
          font-size: 0.9rem;
          color: var(--text-primary);
          line-height: 1.5;
          min-height: 24px;
          max-height: 200px;
          overflow-y: auto;
        }

        .chat-textarea::placeholder {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .chat-textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 0.9rem;
        }

        .cast-btn {
          background: linear-gradient(135deg, var(--accent-secondary), var(--accent-primary));
          color: #000;
          box-shadow: 0 0 12px var(--accent-glow-soft);
        }

        .cast-btn:hover:not(:disabled) {
          transform: scale(1.08);
          box-shadow: 0 0 20px var(--accent-glow);
        }

        .cast-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .stop-btn {
          background: rgba(255, 95, 87, 0.15);
          border: 1px solid rgba(255, 95, 87, 0.4);
          color: var(--tl-red);
          animation: stopPulse 1.5s ease-in-out infinite;
        }

        @keyframes stopPulse {
          0%, 100% { box-shadow: 0 0 6px rgba(255, 95, 87, 0.2); }
          50% { box-shadow: 0 0 16px rgba(255, 95, 87, 0.4); }
        }

        .stop-btn:hover {
          background: rgba(255, 95, 87, 0.25);
          transform: scale(1.05);
        }

        .btn-icon-stop {
          font-size: 0.7rem;
          font-family: var(--font-mono);
        }

        .input-hint {
          margin-top: 0.4rem;
          display: flex;
          justify-content: center;
        }

        .hint-text {
          font-size: 0.65rem;
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }

        .mono-text { font-family: var(--font-mono); }
      `}</style>
    </div>
  );
}
