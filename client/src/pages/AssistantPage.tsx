import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquarePlus,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AqiBadge } from '@/components/shared/AqiBadge';
import { MedicalDisclaimer } from '@/components/shared/MedicalDisclaimer';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useFamilyProfile } from '@/hooks/useFamilyProfile';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { getCached, invalidateCached, setCached } from '@/lib/client-cache';
import {
  STARTER_PROMPTS,
  type ChatMessageItem,
  type ChatSessionSummary,
} from '@/models/chat.model';
import {
  deleteChatSession,
  listCachedSessionMessages,
  listCachedUserChatSessions,
  listSessionMessages,
  listUserChatSessions,
  sendChatMessage,
} from '@/services/chat.service';

const CHAT_CACHE_TTL_MS = 5 * 60 * 1000;

function AssistantMessageCard({
  msg,
  onFollowUpClick,
  disabled,
}: {
  msg: ChatMessageItem;
  onFollowUpClick: (prompt: string) => void;
  disabled: boolean;
}) {
  const [citationsOpen, setCitationsOpen] = useState(false);

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs sm:max-w-[85%] dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            BreatheWise AI
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {msg.environmentalSnapshot ? (
              <AqiBadge
                category={msg.environmentalSnapshot.category}
                aqi={msg.environmentalSnapshot.aqi}
              />
            ) : null}
            {msg.fallbackMode ? <Badge variant="neutral">Verified Guidelines</Badge> : null}
          </div>
        </div>

        {msg.medicalEscalationRequired ? (
          <Alert variant="danger" className="py-2.5 text-xs">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Seek Qualified Medical Care Promptly</p>
              <p>
                BreatheWise AI cannot diagnose or prescribe medication. Follow official local
                advisories or contact medical/emergency services for acute symptoms.
              </p>
            </div>
          </Alert>
        ) : null}

        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {msg.content}
        </p>

        {msg.citations.length > 0 ? (
          <div className="border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setCitationsOpen((prev) => !prev)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {msg.citations.length} verified source{msg.citations.length === 1 ? '' : 's'} used
              </span>
              {citationsOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {citationsOpen ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {msg.citations.map((c) => (
                  <Badge key={c.docId} variant="outline">
                    {c.title} · {c.sourceAuthority}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {msg.followUpSuggestions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {msg.followUpSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={disabled}
                onClick={() => onFollowUpClick(suggestion)}
                className="cursor-pointer rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1 text-left text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-500/15 disabled:opacity-50 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AssistantPage() {
  const { user } = useAuth();
  const { selectedLocation } = useSelectedLocation();
  const { family } = useFamilyProfile();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSessions = user
    ? (getCached<ChatSessionSummary[]>(`chat_sessions:${user.uid}`)?.value ?? [])
    : [];
  const initialActiveId = user
    ? (getCached<string | null>(`chat_active:${user.uid}`)?.value ?? null)
    : null;
  const initialMessages =
    user && initialActiveId
      ? (getCached<ChatMessageItem[]>(`chat_msgs:${user.uid}:${initialActiveId}`)?.value ?? [])
      : [];

  const [sessions, setSessions] = useState<ChatSessionSummary[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialActiveId);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefilled = searchParams.get('q');
    if (prefilled && prefilled.trim()) {
      setInput(prefilled.trim());
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const refreshSessions = useCallback(
    async (forceServer = false) => {
      if (!user) {
        return;
      }
      const key = `chat_sessions:${user.uid}`;
      const memHit = !forceServer ? getCached<ChatSessionSummary[]>(key) : null;
      if (memHit) {
        setSessions(memHit.value);
        if (memHit.isFresh) {
          return;
        }
      } else if (!forceServer) {
        const localSessions = await listCachedUserChatSessions(user.uid);
        if (localSessions) {
          setSessions(localSessions);
        }
      }
      try {
        const list = await listUserChatSessions(user.uid);
        setCached(key, list, CHAT_CACHE_TTL_MS);
        setSessions(list);
      } catch {
        // Non-blocking: user can still start a new conversation even if history read fails
      }
    },
    [user],
  );

  useEffect(() => {
    void refreshSessions(false);
  }, [refreshSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSelectSession(sessionId: string) {
    if (!user) {
      return;
    }
    setActiveSessionId(sessionId);
    setCached(`chat_active:${user.uid}`, sessionId, CHAT_CACHE_TTL_MS);
    setError(null);

    const msgKey = `chat_msgs:${user.uid}:${sessionId}`;
    const memHit = getCached<ChatMessageItem[]>(msgKey);
    if (memHit) {
      setMessages(memHit.value);
      setLoadingThread(false);
      if (memHit.isFresh) {
        return;
      }
    } else {
      setLoadingThread(true);
      const localThread = await listCachedSessionMessages(user.uid, sessionId);
      if (localThread) {
        setMessages(localThread);
        setLoadingThread(false);
      }
    }

    try {
      const thread = await listSessionMessages(user.uid, sessionId);
      setCached(msgKey, thread, CHAT_CACHE_TTL_MS);
      setMessages(thread);
    } catch (err) {
      if (!memHit) {
        setError(err instanceof Error ? err.message : 'Unable to load conversation history.');
      }
    } finally {
      setLoadingThread(false);
    }
  }

  function handleNewChat() {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    if (user) {
      invalidateCached(`chat_active:${user.uid}`);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => {
        const next = prev.filter((s) => s.sessionId !== sessionId);
        if (user) {
          setCached(`chat_sessions:${user.uid}`, next, CHAT_CACHE_TTL_MS);
          invalidateCached(`chat_msgs:${user.uid}:${sessionId}`);
        }
        return next;
      });
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete chat session.');
    }
  }

  async function submitPrompt(rawText: string) {
    const cleaned = rawText.trim();
    if (!cleaned || sending) {
      return;
    }
    setSending(true);
    setError(null);
    setInput('');

    const optimisticUserMsg: ChatMessageItem = {
      messageId: `local_${Date.now()}`,
      sessionId: activeSessionId ?? 'pending',
      role: 'user',
      content: cleaned,
      createdAt: new Date().toISOString(),
      citations: [],
      followUpSuggestions: [],
      environmentalSnapshot: null,
      medicalEscalationRequired: false,
      fallbackMode: false,
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const response = await sendChatMessage({
        location: selectedLocation,
        message: cleaned,
        sessionId: activeSessionId,
        familyId: family?.familyId ?? null,
      });

      setActiveSessionId(response.sessionId);
      const assistantMsg: ChatMessageItem = {
        messageId: response.messageId,
        sessionId: response.sessionId,
        role: 'assistant',
        content: response.reply.content,
        createdAt: response.createdAt,
        citations: response.reply.citations ?? [],
        followUpSuggestions: response.reply.followUpSuggestions ?? [],
        environmentalSnapshot: response.reply.environmentalSnapshot ?? null,
        medicalEscalationRequired: response.medicalEscalationRequired,
        fallbackMode: response.reply.fallbackMode,
      };
      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        if (user) {
          setCached(`chat_active:${user.uid}`, response.sessionId, CHAT_CACHE_TTL_MS);
          setCached(`chat_msgs:${user.uid}:${response.sessionId}`, next, CHAT_CACHE_TTL_MS);
        }
        return next;
      });
      void refreshSessions(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach AI Assistant.');
      // Roll back optimistic message on failure so user can retry easily
      setMessages((prev) => prev.filter((m) => m.messageId !== optimisticUserMsg.messageId));
      setInput(cleaned);
    } finally {
      setSending(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPrompt(input);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            AI Clean-Air Assistant
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Grounded in live {selectedLocation.city} AQI, your family profile, and verified
            public-health guidance.
          </p>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={handleNewChat}>
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          New Chat
        </Button>
      </div>

      {/* Recent Conversations Bar */}
      {sessions.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {sessions.slice(0, 6).map((sess) => {
            const active = sess.sessionId === activeSessionId;
            return (
              <div
                key={sess.sessionId}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border pl-3 pr-1.5 py-1 text-xs transition-colors ${
                  active
                    ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-300'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void handleSelectSession(sess.sessionId)}
                  className="max-w-[170px] cursor-pointer truncate font-medium"
                >
                  {sess.title}
                </button>
                <button
                  type="button"
                  aria-label={`Delete conversation ${sess.title}`}
                  onClick={() => void handleDeleteSession(sess.sessionId)}
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {/* Conversation Thread */}
      {messages.length === 0 && !loadingThread ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Ask About Today’s Air in {selectedLocation.city}
            </CardTitle>
            <CardDescription>
              Tap a starter question below or type your own. Every answer checks deterministic CPCB
              NAQI safety rules before responding.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={sending}
                onClick={() => void submitPrompt(prompt)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 text-left text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {prompt}
              </button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {loadingThread ? (
            <div className="flex items-center justify-center py-10 text-sm text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading conversation…
            </div>
          ) : (
            messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.messageId} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-zinc-950 px-4 py-3 text-sm text-white shadow-xs sm:max-w-[75%] dark:bg-emerald-500 dark:text-zinc-950">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <AssistantMessageCard
                  key={msg.messageId}
                  msg={msg}
                  onFollowUpClick={(p) => void submitPrompt(p)}
                  disabled={sending}
                />
              ),
            )
          )}

          {sending ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                Checking live AQI, risk rules &amp; verified sources…
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleFormSubmit}
        className="sticky bottom-[76px] z-10 rounded-2xl border border-zinc-200/90 bg-white/95 p-2.5 shadow-sm backdrop-blur-xl md:bottom-4 dark:border-zinc-800 dark:bg-zinc-900/95"
      >
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            maxLength={1000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submitPrompt(input);
              }
            }}
            placeholder={`Ask about ${selectedLocation.city} air quality, outdoor plans, indoor ventilation, or commute swaps…`}
            className="max-h-32 flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <Button type="submit" disabled={sending || !input.trim()} className="shrink-0">
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </form>

      <MedicalDisclaimer />
    </div>
  );
}
