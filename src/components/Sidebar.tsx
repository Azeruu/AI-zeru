import { useState } from 'react';
import type { ChatSession, UserInfo } from '../types/chat';

interface SidebarProps {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  userInfo: UserInfo;
  isOpen: boolean;
  onNewChat: () => void;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
}

export default function Sidebar({
  sessions,
  activeSession,
  userInfo,
  isOpen,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSignOut = async () => {
    if (typeof window !== 'undefined' && (window as any).Clerk?.signOut) {
      await (window as any).Clerk.signOut({ redirectUrl: '/' });
    } else {
      window.location.href = '/sign-out';
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="brand-glyph">ψ</span>
          <span className="brand-name">AI-zeru</span>
        </div>
        <button
          id="new-chat-btn"
          className="new-chat-btn"
          onClick={onNewChat}
          aria-label="New Chat"
          title="New spell session"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Session List */}
      <div className="session-list-wrapper">
        <div className="section-label mono-text">SPELL HISTORY</div>
        <div className="session-list" role="list">
          {sessions.length === 0 ? (
            <div className="no-sessions mono-text">No spells cast yet</div>
          ) : (
            sessions.map((session) => {
              const isActive = activeSession?.id === session.id;
              const isHovered = hoveredId === session.id;
              return (
                <div
                  key={session.id}
                  className={`session-item ${isActive ? 'active' : ''}`}
                  role="listitem"
                  onMouseEnter={() => setHoveredId(session.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    className="session-btn"
                    onClick={() => onSelectSession(session)}
                    aria-label={`Load session: ${session.title}`}
                  >
                    <span className="session-icon">
                      {isActive ? '⚡' : '📜'}
                    </span>
                    <div className="session-info">
                      <span className="session-title">{session.title}</span>
                      <span className="session-meta mono-text">
                        {session.messages.length} msg · {formatDate(session.updatedAt)}
                      </span>
                    </div>
                  </button>
                  {isHovered && (
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      aria-label="Delete session"
                      title="Delete this spell"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M9 3L3 9M3 3L9 9"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="user-section">
        <div className="section-divider" />
        <button
          id="user-menu-btn"
          className="user-profile-btn"
          onClick={() => setUserMenuOpen((p) => !p)}
          aria-expanded={userMenuOpen}
          aria-label="User menu"
        >
          <div className="user-avatar-wrapper">
            {userInfo.imageUrl ? (
              <img
                src={userInfo.imageUrl}
                alt={userInfo.firstName}
                className="user-avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {userInfo.firstName[0]?.toUpperCase()}
              </div>
            )}
            <span className="user-status-dot" />
          </div>
          <div className="user-info">
            <span className="user-name">{userInfo.firstName} {userInfo.lastName}</span>
            <span className="user-email mono-text">{userInfo.email}</span>
          </div>
          <span className={`chevron ${userMenuOpen ? 'up' : 'down'}`}>▾</span>
        </button>

        {userMenuOpen && (
          <div className="user-dropdown">
            <div className="dropdown-item dropdown-info">
              <span className="mono-text" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Signed in as
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                {userInfo.firstName} {userInfo.lastName}
              </span>
            </div>
            <div className="dropdown-divider" />
            <a href="/dashboard" className="dropdown-item">
              <span>🌌</span> Dashboard
            </a>
            <button
              id="sign-out-btn"
              className="dropdown-item sign-out-item"
              onClick={handleSignOut}
            >
              <span>⚰️</span> Sign Out
            </button>
          </div>
        )}
      </div>

      <style>{`
        .sidebar {
          width: 260px;
          min-width: 260px;
          height: 100%;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-subtle);
          background: rgba(0, 0, 0, 0.2);
          transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s;
          overflow: hidden;
          position: relative;
        }

        .sidebar.closed {
          width: 0;
          min-width: 0;
          opacity: 0;
          border-right: none;
        }

        /* Header */
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .brand-glyph {
          font-family: var(--font-mono);
          font-size: 1.1rem;
          color: var(--accent-primary);
          text-shadow: 0 0 10px var(--accent-primary);
        }

        .brand-name {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff, var(--accent-primary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          white-space: nowrap;
        }

        .new-chat-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid var(--border-accent);
          background: var(--bg-glass-light);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .new-chat-btn:hover {
          background: rgba(0, 212, 255, 0.1);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          box-shadow: 0 0 10px var(--accent-glow-soft);
        }

        /* Session List */
        .session-list-wrapper {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 0.75rem 0.5rem 0.5rem;
          gap: 0.375rem;
        }

        .section-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          padding: 0 0.5rem 0.5rem;
          white-space: nowrap;
        }

        .mono-text { font-family: var(--font-mono); }

        .session-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .no-sessions {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
          padding: 1.5rem 0.5rem;
        }

        .session-item {
          position: relative;
          border-radius: 7px;
          transition: all 0.15s;
          display: flex;
          align-items: center;
        }

        .session-item:hover,
        .session-item.active {
          background: var(--bg-glass-light);
        }

        .session-item.active {
          background: rgba(0, 212, 255, 0.06);
          border: 1px solid var(--border-accent);
          box-shadow: 0 0 10px var(--accent-glow-soft);
        }

        .session-btn {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.625rem;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          border-radius: 7px;
          min-width: 0;
        }

        .session-icon {
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .session-info {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          min-width: 0;
        }

        .session-title {
          font-size: 0.82rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }

        .session-meta {
          font-size: 0.65rem;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .delete-btn {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.25rem;
          flex-shrink: 0;
          transition: all 0.15s;
        }

        .delete-btn:hover {
          background: rgba(255, 95, 87, 0.15);
          color: var(--tl-red);
        }

        /* User Section */
        .user-section {
          flex-shrink: 0;
          position: relative;
          padding: 0 0.5rem 0.75rem;
        }

        .section-divider {
          height: 1px;
          background: var(--border-subtle);
          margin-bottom: 0.75rem;
        }

        .user-profile-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.625rem;
          background: var(--bg-glass-light);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .user-profile-btn:hover {
          border-color: var(--border-accent);
          background: rgba(0, 212, 255, 0.05);
        }

        .user-avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .user-avatar-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1.5px solid var(--border-accent);
          object-fit: cover;
        }

        .user-avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 212, 255, 0.1);
          border: 1.5px solid var(--border-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--accent-primary);
          font-family: var(--font-sans);
        }

        .user-status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background-color: var(--tl-green);
          border: 1.5px solid var(--bg-secondary);
          box-shadow: 0 0 5px rgba(40, 200, 64, 0.5);
        }

        .user-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .user-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email {
          font-size: 0.65rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chevron {
          font-size: 0.7rem;
          color: var(--text-muted);
          flex-shrink: 0;
          transition: transform 0.2s;
        }

        .chevron.up { transform: rotate(180deg); }

        /* Dropdown */
        .user-dropdown {
          position: absolute;
          bottom: calc(100% - 0.75rem + 4px);
          left: 0.5rem;
          right: 0.5rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-accent);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.4), 0 0 20px var(--accent-glow-soft);
          z-index: 50;
          animation: dropUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes dropUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.82rem;
          color: var(--text-secondary);
          text-decoration: none;
          cursor: pointer;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
          transition: background 0.15s, color 0.15s;
        }

        .dropdown-item:hover {
          background: var(--bg-glass-light);
          color: var(--text-primary);
        }

        .dropdown-info {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.15rem;
          cursor: default;
        }

        .dropdown-info:hover {
          background: transparent;
          color: var(--text-secondary);
        }

        .dropdown-divider {
          height: 1px;
          background: var(--border-subtle);
        }

        .sign-out-item {
          color: #fca5a5;
        }

        .sign-out-item:hover {
          background: rgba(255, 95, 87, 0.08);
          color: var(--tl-red);
        }
      `}</style>
    </aside>
  );
}
