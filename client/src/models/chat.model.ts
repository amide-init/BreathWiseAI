import type { Citation, CurrentAirQuality } from '@/types';

export interface ChatReplyPayload {
  content: string;
  followUpSuggestions: string[];
  citations: Citation[];
  environmentalSnapshot: CurrentAirQuality | null;
  agentTrace?: string[];
  medicalDisclaimerShown: boolean;
  fallbackMode: boolean;
}

export interface ChatMessageItem {
  messageId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string | null;
  citations: Citation[];
  followUpSuggestions: string[];
  environmentalSnapshot: CurrentAirQuality | null;
  agentTrace?: string[];
  medicalEscalationRequired: boolean;
  fallbackMode: boolean;
}

export interface ChatSessionSummary {
  sessionId: string;
  title: string;
  locationId: string | null;
  updatedAt: string | null;
}

export interface SendChatMessageResponse {
  sessionId: string;
  messageId: string;
  createdAt: string;
  medicalEscalationRequired: boolean;
  reply: ChatReplyPayload;
}

export const STARTER_PROMPTS = [
  'Someone smokes at home & AQI is high — how do we lower the harm?',
  'How can I keep indoor air cleaner without a HEPA purifier?',
  'Can my child play outside in my city right now?',
  'I ride a two-wheeler daily — what actually reduces smog intake?',
  'What is the cleanest time window in my city today?',
] as const;
