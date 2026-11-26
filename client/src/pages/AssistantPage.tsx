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

import {
  CopilotChatIllustration,
  GoogleSparkleMark,
} from '@/components/illustrations/GoogleAirIllustrations';
import { AgentTracePill } from '@/components/shared/AgentTracePill';
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
      <div className="cloud-card max-w-[92%] space-y-3 rounded-3xl border border-white/80 bg-white/95 p-4 backdrop-blur-sm sm:max-w-[85%] dark:border-white/[0.09] dark:bg-[#1E1F20]/95">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A73E8] dark:text-[#8AB4F8]">
            <GoogleSparkleMark className="h-4 w-4" />
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

        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-[#E2E8F0]">
          {msg.content}
        </p>

        <AgentTracePill trace={msg.agentTrace} />

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
                className="cursor-pointer rounded-full border border-[#4285F4]/25 bg-[#4285F4]/[0.08] px-3 py-1 text-left text-xs font-medium text-[#1A73E8] transition-colors hover:bg-[#4285F4]/15 disabled:opacity-50 dark:border-[#8AB4F8]/25 dark:bg-[#8AB4F8]/12 dark:text-[#8AB4F8] dark:hover:bg-[#8AB4F8]/20"
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
        agentTrace: response.reply.agentTrace ?? [],
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
        <div className="flex items-center gap-3">
          <CopilotChatIllustration className="hidden h-14 w-20 shrink-0 sm:block" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#202124] dark:text-[#E3E3E3]">
              Ask BreatheWise AI
            </h1>
            <p className="text-sm text-[#5F6368] dark:text-[#9AA0A6]">
              Grounded in live {selectedLocation.city} AQI, your home setup, and realistic
              harm-reduction guidance.
            </p>
          </div>
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
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border py-1 pr-1.5 pl-3 text-xs transition-colors ${
                  active
                    ? 'border-[#4285F4]/40 bg-[#4285F4]/12 text-[#1A73E8] dark:border-[#8AB4F8]/40 dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]'
                    : 'border-[#DADCE0] bg-white text-[#5F6368] hover:border-[#4285F4]/40 dark:border-white/[0.1] dark:bg-[#1E1F20] dark:text-[#BDC1C6]'
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
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[#9AA0A6] hover:bg-[#EA4335]/15 hover:text-[#EA4335] dark:hover:text-[#F28B82]"
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
              <GoogleSparkleMark className="h-5 w-5" />
              Ask About Today’s Air in {selectedLocation.city}
            </CardTitle>
            <CardDescription>
              Tap a starter question below or type your own. Every answer runs our planning &amp;
              reasoning tools with live city AQI.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={sending}
                onClick={() => void submitPrompt(prompt)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#4285F4]/25 bg-[#4285F4]/[0.08] px-3.5 py-2 text-left text-xs font-medium text-[#1A73E8] transition-colors hover:bg-[#4285F4]/15 disabled:opacity-50 dark:border-[#8AB4F8]/25 dark:bg-[#8AB4F8]/12 dark:text-[#8AB4F8] dark:hover:bg-[#8AB4F8]/20"
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
            <div className="flex items-center justify-center py-10 text-sm text-[#5F6368] dark:text-[#9AA0A6]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#4285F4]" />
              Loading conversation…
            </div>
          ) : (
            messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.messageId} className="flex justify-end">
                  <div className="cloud-card max-w-[85%] rounded-3xl rounded-br-md bg-[#4285F4] px-4 py-3 text-sm text-white sm:max-w-[75%] dark:bg-[#8AB4F8] dark:text-[#131314]">
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
              <div className="cloud-card inline-flex items-center gap-2 rounded-3xl border border-white/80 bg-white/95 px-4 py-3 text-xs text-[#5F6368] dark:border-white/[0.09] dark:bg-[#1E1F20] dark:text-[#9AA0A6]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4285F4] dark:text-[#8AB4F8]" />
                Planning with live {selectedLocation.city} AQI &amp; verified tools…
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleFormSubmit}
        className="cloud-card sticky bottom-[76px] z-10 rounded-3xl border border-white/80 bg-white/95 p-2.5 backdrop-blur-xl md:bottom-4 dark:border-white/[0.1] dark:bg-[#1E1F20]/95"
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
            className="max-h-32 flex-1 resize-none rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2 text-sm text-[#202124] outline-none focus:border-[#4285F4] focus:bg-white focus:ring-2 focus:ring-[#4285F4]/20 dark:border-white/[0.1] dark:bg-[#131314] dark:text-[#E3E3E3] dark:placeholder:text-[#9AA0A6] dark:focus:border-[#8AB4F8]"
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
