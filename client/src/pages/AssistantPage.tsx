import {
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Home,
  Leaf,
  Loader2,
  MapPin,
  MessageSquarePlus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  Wind,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  CopilotChatIllustration,
  GoogleSparkleMark,
} from '@/components/illustrations/GoogleAirIllustrations';
import { AgentTracePill } from '@/components/shared/AgentTracePill';
import { AqiBadge } from '@/components/shared/AqiBadge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useFamilyProfile } from '@/hooks/useFamilyProfile';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { getCached, invalidateCached, setCached } from '@/lib/client-cache';
import type { ChatMessageItem, ChatSessionSummary } from '@/models/chat.model';
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
      <div className="cloud-card w-full max-w-[95%] space-y-3 rounded-3xl rounded-tl-lg border border-white/80 bg-white/95 p-4 backdrop-blur-sm sm:max-w-[86%] sm:p-5 dark:border-white/[0.09] dark:bg-[#1E1F20]/95">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A73E8] dark:text-[#8AB4F8]">
            <GoogleSparkleMark className="h-4 w-4" />
            BreathWiseAI
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
                BreathWiseAI cannot diagnose or prescribe medication. Follow official local
                advisories or contact medical/emergency services for acute symptoms.
              </p>
            </div>
          </Alert>
        ) : null}

        <p className="whitespace-pre-line text-sm leading-relaxed text-[#202124] dark:text-[#E3E3E3]">
          {msg.content}
        </p>

        <AgentTracePill trace={msg.agentTrace} />

        {msg.citations.length > 0 ? (
          <div className="border-t border-[#E8EAED] pt-2.5 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setCitationsOpen((prev) => !prev)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-[#E3E3E3]"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#34A853] dark:text-[#81C995]" />
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
                className="cursor-pointer rounded-full border border-[#4285F4]/25 bg-[#4285F4]/[0.08] px-3 py-1.5 text-left text-xs font-medium text-[#1A73E8] transition-colors hover:bg-[#4285F4]/15 disabled:opacity-50 dark:border-[#8AB4F8]/25 dark:bg-[#8AB4F8]/12 dark:text-[#8AB4F8] dark:hover:bg-[#8AB4F8]/20"
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
  const { user, userProfile } = useAuth();
  const { selectedLocation } = useSelectedLocation();
  const { family, members } = useFamilyProfile();
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize composer textarea cleanly up to 128px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  useEffect(() => {
    const prefilled = searchParams.get('q');
    if (prefilled && prefilled.trim()) {
      setInput(prefilled.trim());
      setSearchParams({}, { replace: true });
      textareaRef.current?.focus();
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
    if (messages.length > 0 || sending) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
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
    textareaRef.current?.focus();
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

  const firstName =
    userProfile?.displayName?.split(' ')[0] ?? user?.displayName?.split(' ')[0] ?? 'there';

  const starterCards = [
    {
      label: 'Family & Forecast',
      prompt: `Check today's PM2.5 vs dust in ${selectedLocation.city} and safest school, play, or walk times for my family.`,
      icon: Wind,
      accent:
        'bg-[#4285F4]/12 text-[#1A73E8] border-[#4285F4]/25 dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8] dark:border-[#8AB4F8]/25',
    },
    {
      label: 'My Impact & Streak',
      prompt:
        'Review my 14-day CO₂ avoided & exposure protection streak, and suggest my easiest next win.',
      icon: Leaf,
      accent:
        'bg-[#34A853]/12 text-[#1E8E3E] border-[#34A853]/25 dark:bg-[#81C995]/15 dark:text-[#81C995] dark:border-[#81C995]/25',
    },
    {
      label: 'Indoor & Harm-Reduction',
      prompt: `What are realistic zero-cost indoor fixes in ${selectedLocation.city} without a HEPA purifier (even with cooking or dhoop)?`,
      icon: Home,
      accent:
        'bg-[#FBBC05]/18 text-[#9A6700] border-[#FBBC05]/30 dark:bg-[#FDD663]/15 dark:text-[#FDD663] dark:border-[#FDD663]/25',
    },
    {
      label: 'City Air & Commute',
      prompt: `Why is ${selectedLocation.city}'s air like this today (wind & pollutants), and how should I adjust my daily commute?`,
      icon: Sparkles,
      accent:
        'bg-[#EA4335]/12 text-[#C5221F] border-[#EA4335]/25 dark:bg-[#F28B82]/15 dark:text-[#F28B82] dark:border-[#F28B82]/25',
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col pb-44 md:pb-36">
      {/* Compact Top Copilot Context Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4285F4]/25 bg-white/90 px-3 py-1 text-xs font-semibold text-[#202124] shadow-2xs dark:border-white/[0.1] dark:bg-[#1E1F20]/90 dark:text-[#E3E3E3]">
            <GoogleSparkleMark className="h-3.5 w-3.5" />
            Ask BreathWiseAI
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#4285F4]/10 px-2.5 py-1 text-[11px] font-medium text-[#1A73E8] dark:bg-[#8AB4F8]/14 dark:text-[#8AB4F8]">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {selectedLocation.city}
          </span>
          {members.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#34A853]/10 px-2.5 py-1 text-[11px] font-medium text-[#137333] dark:bg-[#81C995]/14 dark:text-[#81C995]">
              <Users className="h-3 w-3" aria-hidden="true" />
              {members.length} family member{members.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#3C4043] transition-colors hover:border-[#4285F4]/50 hover:text-[#1A73E8] dark:border-white/[0.12] dark:bg-[#1E1F20] dark:text-[#E3E3E3] dark:hover:border-[#8AB4F8]/50 dark:hover:text-[#8AB4F8]"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
          New Chat
        </button>
      </div>

      {/* Recent Conversations Strip */}
      {sessions.length > 0 ? (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          {sessions.slice(0, 6).map((sess) => {
            const active = sess.sessionId === activeSessionId;
            return (
              <div
                key={sess.sessionId}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border py-1 pr-1.5 pl-3 text-xs transition-colors ${
                  active
                    ? 'border-[#4285F4]/40 bg-[#4285F4]/12 text-[#1A73E8] dark:border-[#8AB4F8]/40 dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]'
                    : 'border-[#DADCE0] bg-white/90 text-[#5F6368] hover:border-[#4285F4]/40 dark:border-white/[0.1] dark:bg-[#1E1F20]/90 dark:text-[#BDC1C6]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void handleSelectSession(sess.sessionId)}
                  className="max-w-[165px] cursor-pointer truncate font-medium"
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

      {error ? (
        <div className="mb-4">
          <Alert variant="danger">{error}</Alert>
        </div>
      ) : null}

      {/* Conversation Area OR Gemini-Style Welcome Canvas */}
      {messages.length === 0 && !loadingThread ? (
        <div className="flex flex-1 flex-col items-center justify-center py-4 sm:py-8">
          <CopilotChatIllustration className="mb-3 h-16 w-24" />
          <h1 className="font-display text-center text-2xl font-bold tracking-tight text-[#202124] sm:text-3xl dark:text-[#E3E3E3]">
            Hi <span className="text-[#4285F4] dark:text-[#8AB4F8]">{firstName}</span>, how can I
            help today?
          </h1>
          <p className="mt-1.5 max-w-lg text-center text-sm text-[#5F6368] dark:text-[#9AA0A6]">
            Ask anything about live <strong>{selectedLocation.city}</strong> air quality, kids’
            play, indoor fixes, or commute swaps.
          </p>

          {/* 4-Color Starter Suggestion Grid */}
          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {starterCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  disabled={sending}
                  onClick={() => void submitPrompt(card.prompt)}
                  className="cloud-card group flex cursor-pointer flex-col items-start gap-2 rounded-3xl border border-white/80 bg-white/95 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#4285F4]/40 disabled:opacity-50 dark:border-white/[0.09] dark:bg-[#1E1F20]/95 dark:hover:border-[#8AB4F8]/40"
                >
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${card.accent}`}
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {card.label}
                  </span>
                  <span className="text-xs leading-relaxed font-medium text-[#3C4043] group-hover:text-[#202124] dark:text-[#C4C7C5] dark:group-hover:text-[#E3E3E3]">
                    {card.prompt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {loadingThread ? (
            <div className="flex items-center justify-center py-12 text-sm text-[#5F6368] dark:text-[#9AA0A6]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#4285F4]" />
              Loading conversation…
            </div>
          ) : (
            messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.messageId} className="flex justify-end">
                  <div className="cloud-card max-w-[85%] rounded-3xl rounded-br-md bg-[#4285F4] px-4 py-3 text-sm leading-relaxed text-white sm:max-w-[75%] dark:bg-[#8AB4F8] dark:text-[#131314]">
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
              <div className="cloud-card inline-flex items-center gap-2.5 rounded-3xl border border-white/80 bg-white/95 px-4 py-3 text-xs font-medium text-[#5F6368] dark:border-white/[0.09] dark:bg-[#1E1F20] dark:text-[#9AA0A6]">
                <GoogleSparkleMark className="h-4 w-4 animate-pulse" />
                <span>Planning with live {selectedLocation.city} AQI &amp; verified tools…</span>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} className="h-4" />
        </div>
      )}

      {/* Fixed Bottom Floating Gemini-Style Chat Composer Dock */}
      <div className="pointer-events-none fixed right-0 bottom-[66px] left-0 z-30 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA]/95 to-transparent px-3 pt-6 pb-2.5 md:bottom-0 md:left-60 md:px-8 md:pb-4 dark:from-[#131314] dark:via-[#131314]/95">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <form
            onSubmit={handleFormSubmit}
            className="cloud-card relative overflow-hidden rounded-[28px] border border-[#DADCE0] bg-white/98 p-2 transition-all focus-within:border-[#4285F4]/70 focus-within:ring-2 focus-within:ring-[#4285F4]/20 dark:border-white/[0.12] dark:bg-[#1E1F20]/98 dark:focus-within:border-[#8AB4F8]/70 dark:focus-within:ring-[#8AB4F8]/20"
          >
            <div className="google-ribbon h-[2px] w-full opacity-75" aria-hidden="true" />
            <div className="flex items-end gap-2 px-2 pt-1.5 pb-1">
              <textarea
                ref={textareaRef}
                rows={1}
                maxLength={1000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void submitPrompt(input);
                  }
                }}
                placeholder={`Ask BreathWiseAI about ${selectedLocation.city} air, home fixes, or kids’ play…`}
                className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2 pl-1 text-sm text-[#202124] outline-none placeholder:text-[#5F6368] dark:text-[#E3E3E3] dark:placeholder:text-[#9AA0A6]"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#4285F4] text-white shadow-sm transition-all hover:bg-[#3367D6] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DADCE0] disabled:text-[#9AA0A6] dark:bg-[#8AB4F8] dark:text-[#131314] dark:hover:bg-[#A8C7FA] dark:disabled:bg-white/[0.1] dark:disabled:text-[#5F6368]"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.4} aria-hidden="true" />
                )}
              </button>
            </div>
          </form>

          <p className="mt-1.5 text-center text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
            BreathWiseAI grounds answers in live {selectedLocation.city} AQI &amp; verified
            guidelines — general guidance only, not medical diagnosis.
          </p>
        </div>
      </div>
    </div>
  );
}
