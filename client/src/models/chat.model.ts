import type { Citation, CurrentAirQuality } from '@/types';

export interface ChatReplyPayload {
  content: string;
  followUpSuggestions: string[];
  citations: Citation[];
  environmentalSnapshot: CurrentAirQuality | null;
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
  'What is the current air quality in my location?',
  'Can my child play outside today?',
  'Should I go jogging this morning?',
  'How can I improve indoor air quality?',
  'How can I reduce pollution from my commute?',
] as const;
