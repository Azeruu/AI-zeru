import type { ChatSession, Message } from '../types/chat';

const STORAGE_KEY = 'aizeru_chat_sessions';
const ACTIVE_SESSION_KEY = 'aizeru_active_session';

export function getSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  if (typeof window === 'undefined') return;
  const sessions = getSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function deleteSession(sessionId: string): void {
  if (typeof window === 'undefined') return;
  const sessions = getSessions().filter((s) => s.id !== sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function setActiveSessionId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function createNewSession(model?: string): ChatSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: 'New Spell',
    messages: [],
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function generateSessionTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim().slice(0, 45);
  return trimmed.length < firstMessage.trim().length ? `${trimmed}...` : trimmed;
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
