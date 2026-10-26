import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SignInButton } from '@clerk/astro/react';
import { SiGithub } from '@icons-pack/react-simple-icons';

/* ── Types ── */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/* ── Floating Particles ── */
const Particles: React.FC = () => {
  const [particles, setParticles] = useState<
    { id: number; left: string; size: string; duration: string; delay: string }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 2.5 + 1}px`,
        duration: `${Math.random() * 8 + 8}s`,
        delay: `${Math.random() * 6}s`,
      }))
    );
  }, []);

  return (
    <div className="lp-particles" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            boxShadow: `0 0 6px #3674B5`,
          }}
        />
      ))}
    </div>
  );
};

/* ── Embedded Landing Chat ── */
const LandingChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content:
          'Salam, pengembara. Aku AI-zeru, ditenagai oleh sihir arcane Zoltraak. Tanyakan apa saja padaku — sesi ini bersifat sementara, bagai mantra yang ditiup angin. ✨',
      },
    ]);
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, streamText]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setStreaming(true);
    setStreamText('');

    abortRef.current = new AbortController();
    try {
      const apiMessages = nextMessages.map(({ role, content }) => ({ role, content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model: 'openai/gpt-oss-20b' }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                full += parsed.content;
                setStreamText(full);
              }
            } catch { /* ignore */ }
          }
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: full }]);
      setStreamText('');
      setStreaming(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '⚠️ The spell failed. Try again.' },
        ]);
      }
      setStreamText('');
      setStreaming(false);
    }
  }, [input, messages, streaming]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  };

  return (
    <div className="lc-root">
      <div className="lc-messages" ref={messagesContainerRef} role="log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`lc-bubble lc-${m.role}`}>
            {m.role === 'assistant' && <span className="lc-avatar">AI</span>}
            <div className="lc-text">{m.content}</div>
            {m.role === 'user' && <span className="lc-avatar lc-user-avatar">You</span>}
          </div>
        ))}
        {streaming && streamText && (
          <div className="lc-bubble lc-assistant">
            <span className="lc-avatar">AI</span>
            <div className="lc-text lc-streaming">
              {streamText}
              <span className="lc-cursor" />
            </div>
          </div>
        )}
        {streaming && !streamText && (
          <div className="lc-bubble lc-assistant">
            <span className="lc-avatar">AI</span>
            <div className="lc-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      <div className="lc-input-wrap">
        <textarea
          ref={textareaRef}
          className="lc-textarea"
          value={input}
          rows={1}
          placeholder="Rapalkan mantramu... (Enter untuk kirim)"
          onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
          onKeyDown={handleKey}
          disabled={streaming}
          aria-label="Landing page chat input"
        />
        <button
          className={`lc-send ${streaming ? 'lc-stop' : ''}`}
          onClick={streaming ? () => abortRef.current?.abort() : send}
          aria-label={streaming ? 'Stop' : 'Send'}
        >
          {streaming ? '■' : (
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M15.5 9L2.5 2.5L5.5 9L2.5 15.5L15.5 9Z" fill="currentColor" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
      <p className="lc-hint">Session sementara · login untuk simpan riwayat</p>
    </div>
  );
};

/* ── Main Landing Page ── */
const LandingPage: React.FC = () => {
  return (
    <div className="lp-root">
      <Particles />

      <div className="lp-glow-bot" aria-hidden="true" />
      <div className="lp-glow-top" aria-hidden="true" />

      {/* ── HERO SECTION ── */}

      <div className='lp-top'>
        {/* LEFT — Mascot + Chat */}
        <div className="lp-left">
          <div className="lp-mascot-wrap" aria-label="Frieren mascot">
            <div className="lp-mascot-glow" aria-hidden="true" />
            <img src="frieren2.webp" alt="frieren" className='frieren' />
          </div>

          <div className="lp-chat-panel">
            <div className="lp-chat-header">
              <span className="lp-chat-dot" style={{ background: '#ff5f57' }} />
              <span className="lp-chat-dot" style={{ background: '#febc2e' }} />
              <span className="lp-chat-dot" style={{ background: '#28c840' }} />
              <span className="lp-chat-title">AI-zeru · Demo Chat</span>
              <span className="lp-chat-badge">EPHEMERAL</span>
            </div>
            <LandingChat />
          </div>
        </div>

        {/* RIGHT — Info + Actions */}
        <div className="lp-right">

          {/* Block 1: Title */}
          <div className="lp-block lp-block-title">
            <div className="lp-eyebrow">THE ZOLTRAAK INTERFACE</div>
            <h1 className="lp-title">AIzeru</h1>
            <div className="lp-title-underline" aria-hidden="true" />
          </div>

          {/* Block 2: Description + Specs */}
          <div className="lp-block lp-block-desc">
            <p className="lp-desc-text">
              AI wrapper chat berkecepatan tinggi dengan nuansa{' '}
              <em>medieval fantasy</em>. Rapallah sihir lewat antarmuka terminal
              modern yang didukung oleh Groq LPU.
            </p>
            <div className="lp-specs">
              <div className="lp-spec-row">
                <span className="lp-spec-label">MODEL</span>
                <span className="lp-spec-value">Groq · openai/gpt-oss-20b</span>
              </div>
              <div className="lp-spec-row">
                <span className="lp-spec-label">FRONTEND</span>
                <span className="lp-spec-value">Astro + React (SSR)</span>
              </div>
              <div className="lp-spec-row">
                <span className="lp-spec-label">AUTH</span>
                <span className="lp-spec-value">Clerk</span>
              </div>
              <div className="lp-spec-row">
                <span className="lp-spec-label">RUNTIME</span>
                <span className="lp-spec-value">Bun · Edge-ready</span>
              </div>
            </div>
          </div>

          {/* Block 3: Actions */}
          <div className="lp-block lp-block-actions">
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button
                id="lp-get-started"
                type="button"
                className="lp-btn lp-btn-primary"
              >
                <span className="lp-btn-glyph">⚡</span>
                Get Started
              </button>
            </SignInButton>

            <a
              id="lp-documentation"
              href="https://github.com/azeruu/ai-zeru"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn lp-btn-secondary"
            >
              <SiGithub size={16} aria-hidden="true" />
              Documentation
            </a>

            <p className="lp-action-hint">
              Login untuk menyimpan riwayat chat &amp; fitur lanjutan
            </p>
          </div>
        </div>
      </div>

      <div className='lp-bottom'>
        {/* ── FEATURE CARDS ── */}
        <div className="lp-features-grid">

          <div className="lp-card" id="feature-chat-history">
            <div className="lp-card-badge">Coming Soon</div>
            <h3 className="lp-card-title">Cloud Chat History</h3>
            <p className="lp-card-desc">
              Manajemen riwayat chat berbasis database cloud. Sinkronisasi sesi
              antar perangkat, pencarian, dan arsip sihir.
            </p>
            <div className="lp-card-glow" aria-hidden="true" />
          </div>

          <div className="lp-card" id="feature-custom-models">
            <div className="lp-card-badge">Ready</div>
            <h3 className="lp-card-title">Custom AI Models</h3>
            <p className="lp-card-desc">
              Pilihan model AI kustom tambahan — dari Qwen, DeepSeek, hingga
              Llama. Tune parameter sihir sesuka hati.
            </p>
            <div className="lp-card-glow" aria-hidden="true" />
          </div>

          <div className="lp-card" id="feature-grimoire">
            <div className="lp-card-badge">Coming Soon</div>
            <h3 className="lp-card-title">Grimoire Gallery</h3>
            <p className="lp-card-desc">
              Galeri tema sihir &amp; kustomisasi antarmuka. Pilih mantra visual
              favoritmu dari koleksi Zoltraak Grimoire.
            </p>
            <div className="lp-card-glow" aria-hidden="true" />
          </div>
        </div>
      </div>

      <style>{`
        /* ── ROOT: locked to one viewport ── */
        .lp-root {
          position: relative;
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          background: #0B0B0C;
          color: #FDFBF7;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 1;
        }

        /* ── AMBIENT GLOWS ── */
        .lp-glow-bot {
          position: fixed;
          bottom: -10%;
          left: 50%;
          transform: translateX(-50%);
          width: 120vw;
          height: 60vh;
          background: radial-gradient(ellipse at center, rgba(54,116,181,0.13) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .lp-glow-top {
          position: fixed;
          top: -20%;
          right: -10%;
          width: 60vw;
          height: 60vh;
          background: radial-gradient(ellipse at center, rgba(54,116,181,0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .lp-particles {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        /* ── TOP SECTION: ~62% of viewport ── */
        .lp-top {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          width: 100%;
          height: 75vh;
          padding: 14px 24px 10px;
          gap: 20px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        /* ── LEFT COLUMN: mascot + chat ── */
        .lp-left {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          width: 65%;
          height: 100%;
          gap: 16px;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }

        /* Mascot */
        .lp-mascot-wrap {
          position: relative;
          flex-shrink: 0;
          width: clamp(80px, 10vw, 130px);
          align-self: center;
        }
        .lp-mascot-glow {
          position: absolute;
          inset: -16px;
          background: radial-gradient(circle, rgba(54,116,181,0.28) 0%, transparent 70%);
          border-radius: 50%;
          animation: mascotPulse 3s ease-in-out infinite;
        }
        @keyframes mascotPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
        .frieren {
          width: 100%;
          height: auto;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 0 16px rgba(54,116,181,0.4));
          animation: frierenFloat 4s ease-in-out infinite;
          display: block;
        }
        @keyframes frierenFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-7px); }
        }

        /* Chat Panel */
        .lp-chat-panel {
          flex: 1;
          height: 100%;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: rgba(11, 11, 14, 0.88);
          border: 1px solid rgba(54,116,181,0.22);
          border-radius: 13px;
          backdrop-filter: blur(16px);
          box-shadow:
            0 0 0 1px rgba(54,116,181,0.08),
            0 16px 48px rgba(0,0,0,0.55),
            0 0 32px rgba(54,116,181,0.07);
        }
        .lp-chat-header {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 14px;
          background: rgba(0,0,0,0.38);
          border-bottom: 1px solid rgba(54,116,181,0.13);
          flex-shrink: 0;
        }
        .lp-chat-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .lp-chat-title {
          font-family: 'Fira Code', monospace;
          font-size: 0.62rem;
          color: rgba(253,251,247,0.45);
          margin-left: 4px;
          flex: 1;
          letter-spacing: 0.03em;
        }
        .lp-chat-badge {
          font-family: 'Fira Code', monospace;
          font-size: 0.54rem;
          letter-spacing: 0.12em;
          color: #3674B5;
          background: rgba(54,116,181,0.1);
          border: 1px solid rgba(54,116,181,0.28);
          padding: 1px 7px;
          border-radius: 999px;
        }

        /* ── RIGHT COLUMN: info + actions ── */
        .lp-right {
          width: 35%;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 14px;
          overflow: hidden;
          padding-left: 8px;
        }
        .lp-block { position: relative; }

        /* Title */
        .lp-eyebrow {
          font-family: 'Fira Code', monospace;
          font-size: 0.58rem;
          letter-spacing: 0.28em;
          color: #3674B5;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .lp-title {
          font-family: 'Cinzel Decorative', 'MedievalSharp', serif;
          font-size: clamp(2.2rem, 4.5vw, 4rem);
          font-weight: 900;
          color: #FDFBF7;
          line-height: 0.88;
          letter-spacing: -0.02em;
          text-shadow:
            0 0 32px rgba(54,116,181,0.38),
            0 0 64px rgba(54,116,181,0.13);
          margin: 0;
        }
        .lp-title-underline {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, #3674B5, transparent);
          margin-top: 8px;
          border-radius: 1px;
        }

        /* Description + Specs */
        .lp-desc-text {
          font-size: 0.78rem;
          line-height: 1.6;
          color: rgba(253,251,247,0.6);
          margin: 0 0 10px 0;
        }
        .lp-desc-text em {
          color: #7EB3E8;
          font-style: normal;
        }
        .lp-specs {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-left: 2px solid rgba(54,116,181,0.28);
          padding-left: 10px;
        }
        .lp-spec-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .lp-spec-label {
          font-family: 'Fira Code', monospace;
          font-size: 0.56rem;
          letter-spacing: 0.18em;
          color: #3674B5;
          min-width: 62px;
          flex-shrink: 0;
        }
        .lp-spec-value {
          font-family: 'Fira Code', monospace;
          font-size: 0.65rem;
          color: rgba(253,251,247,0.7);
        }

        /* Actions */
        .lp-block-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .lp-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
          position: relative;
          overflow: hidden;
        }
        .lp-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.07), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .lp-btn:hover::before { opacity: 1; }
        .lp-btn-primary {
          background: #3674B5;
          color: #FDFBF7;
          box-shadow: 0 0 18px rgba(54,116,181,0.32), 0 3px 16px rgba(0,0,0,0.35);
        }
        .lp-btn-primary:hover {
          background: #FDFBF7;
          color: #0B0B0C;
          box-shadow: 0 0 26px rgba(253,251,247,0.2), 0 6px 24px rgba(0,0,0,0.45);
          transform: translateY(-1px);
        }
        .lp-btn-glyph { font-size: 0.95rem; }
        .lp-btn-secondary {
          background: rgba(54,116,181,0.1);
          color: #FDFBF7;
          border: 1px solid rgba(54,116,181,0.32);
        }
        .lp-btn-secondary:hover {
          background: #FDFBF7;
          color: #0B0B0C;
          border-color: #FDFBF7;
          transform: translateY(-1px);
        }
        .lp-action-hint {
          font-family: 'Fira Code', monospace;
          font-size: 0.55rem;
          color: rgba(253,251,247,0.25);
          letter-spacing: 0.04em;
          margin: 0;
          text-align: center;
        }

        /* ── BOTTOM SECTION: feature cards ── */
        .lp-bottom {
          position: relative;
          z-index: 1;
          width: 100%;
          flex: 1;
          min-height: 0;
          padding: 0 24px 14px;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .lp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          border-top: 1px solid rgba(54,116,181,0.1);
          padding-top: 12px;
        }
        .lp-card {
          position: relative;
          background: rgba(11, 11, 14, 0.72);
          border: 1px solid rgba(54,116,181,0.13);
          border-radius: 12px;
          padding: 12px 14px;
          overflow: hidden;
          transition: border-color 0.3s, transform 0.3s;
          backdrop-filter: blur(12px);
        }
        .lp-card:hover {
          border-color: rgba(54,116,181,0.38);
          transform: translateY(-3px);
        }
        .lp-card:hover .lp-card-glow { opacity: 1; }
        .lp-card-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 100%, rgba(54,116,181,0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.4s;
          pointer-events: none;
        }
        .lp-card-badge {
          display: inline-block;
          font-family: 'Fira Code', monospace;
          font-size: 0.54rem;
          letter-spacing: 0.14em;
          color: #3674B5;
          background: rgba(54,116,181,0.09);
          border: 1px solid rgba(54,116,181,0.22);
          padding: 1px 8px;
          border-radius: 999px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .lp-card-title {
          font-family: 'Cinzel', serif;
          font-size: 0.82rem;
          font-weight: 700;
          color: #FDFBF7;
          margin: 0 0 5px 0;
        }
        .lp-card-desc {
          font-size: 0.72rem;
          line-height: 1.55;
          color: rgba(253,251,247,0.45);
          margin: 0;
        }

        /* ── LANDING CHAT ── */
        .lc-root {
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }
        .lc-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          scroll-behavior: smooth;
        }
        .lc-messages::-webkit-scrollbar { width: 5px; }
        .lc-messages::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .lc-messages::-webkit-scrollbar-thumb { background: rgba(54,116,181,0.38); border-radius: 3px; }
        .lc-messages::-webkit-scrollbar-thumb:hover { background: rgba(54,116,181,0.7); }
        .lc-bubble {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          animation: bubbleIn 0.22s ease-out both;
        }
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lc-assistant { flex-direction: row; }
        .lc-user { flex-direction: row-reverse; }
        .lc-avatar {
          font-family: 'Fira Code', monospace;
          font-size: 0.52rem;
          font-weight: 700;
          min-width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(54,116,181,0.18);
          border: 1px solid rgba(54,116,181,0.38);
          color: #7EB3E8;
        }
        .lc-user-avatar {
          background: rgba(253,251,247,0.07);
          border-color: rgba(253,251,247,0.18);
          color: rgba(253,251,247,0.55);
        }
        .lc-text {
          background: rgba(54,116,181,0.07);
          border: 1px solid rgba(54,116,181,0.16);
          border-radius: 9px;
          padding: 7px 11px;
          font-size: 0.75rem;
          line-height: 1.55;
          color: rgba(253,251,247,0.82);
          max-width: calc(100% - 36px);
          word-break: break-word;
        }
        .lc-user .lc-text {
          background: rgba(253,251,247,0.05);
          border-color: rgba(253,251,247,0.1);
        }
        .lc-streaming { position: relative; }
        .lc-cursor {
          display: inline-block;
          width: 2px;
          height: 0.82em;
          background: #3674B5;
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: blink 0.7s step-end infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .lc-typing {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 7px 11px;
          background: rgba(54,116,181,0.07);
          border: 1px solid rgba(54,116,181,0.16);
          border-radius: 9px;
        }
        .lc-typing span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #3674B5;
          animation: typingDot 1.2s ease-in-out infinite;
        }
        .lc-typing span:nth-child(2) { animation-delay: 0.2s; }
        .lc-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.35; }
          40%           { transform: scale(1);   opacity: 1; }
        }
        .lc-input-wrap {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 8px 12px;
          border-top: 1px solid rgba(54,116,181,0.13);
          background: rgba(0,0,0,0.22);
          flex-shrink: 0;
        }
        .lc-textarea {
          flex: 1;
          background: rgba(54,116,181,0.05);
          border: 1px solid rgba(54,116,181,0.18);
          border-radius: 7px;
          padding: 7px 10px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.76rem;
          color: #FDFBF7;
          resize: none;
          outline: none;
          line-height: 1.5;
          min-height: 32px;
          max-height: 100px;
          overflow-y: auto;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .lc-textarea::placeholder { color: rgba(253,251,247,0.22); font-size: 0.72rem; }
        .lc-textarea:focus {
          border-color: rgba(54,116,181,0.45);
          box-shadow: 0 0 0 2px rgba(54,116,181,0.1);
        }
        .lc-textarea:disabled { opacity: 0.45; cursor: not-allowed; }
        .lc-send {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          border: none;
          background: #3674B5;
          color: #FDFBF7;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 0.7rem;
          transition: all 0.18s;
          box-shadow: 0 0 8px rgba(54,116,181,0.28);
        }
        .lc-send:hover { background: #4a8fd0; transform: scale(1.06); }
        .lc-stop {
          background: rgba(255,95,87,0.13);
          border: 1px solid rgba(255,95,87,0.38);
          color: #ff5f57;
        }
        .lc-stop:hover { background: rgba(255,95,87,0.22); }
        .lc-hint {
          font-family: 'Fira Code', monospace;
          font-size: 0.52rem;
          color: rgba(253,251,247,0.18);
          text-align: center;
          padding: 4px 12px 6px;
          margin: 0;
          flex-shrink: 0;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
